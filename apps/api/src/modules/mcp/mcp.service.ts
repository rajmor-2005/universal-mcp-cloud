import { Injectable } from '@nestjs/common';
import { ConnectorService } from '../connector/connector.service';
import { ToolExecutionService } from './tool-execution.service';
import { RedisService } from '../../common/redis/redis.service';
import { createLogger } from '@umcp/logger';
import {
  MCP_CONSTANTS,
  McpMethodNotFoundError,
  McpInvalidParamsError,
  McpToolNotFoundError,
  NotFoundError,
} from '@umcp/shared';
import { DatabaseService } from '../../common/database/database.service';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

@Injectable()
export class McpService {
  private readonly logger = createLogger('McpService');

  constructor(
    private readonly connectors: ConnectorService,
    private readonly toolExecution: ToolExecutionService,
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Handle an incoming MCP JSON-RPC request for a specific workspace.
   */
  async handleRequest(
    workspaceId: string,
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    this.logger.debug(
      { workspaceId, method: request.method },
      'MCP request received',
    );

    try {
      let result: unknown;

      switch (request.method) {
        case 'initialize':
          result = await this.handleInitialize(workspaceId, request.params);
          break;
        case 'notifications/initialized':
        case 'initialized':
        case 'notifications/cancelled':
        case 'cancelled':
        case '$/cancelRequest':
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {},
          };
        case 'tools/list':
          result = await this.handleToolsList(workspaceId, request.params);
          break;
        case 'tools/call':
          result = await this.handleToolsCall(workspaceId, request.params);
          break;
        case 'resources/list':
          result = await this.handleResourcesList(workspaceId);
          break;
        case 'prompts/list':
          result = await this.handlePromptsList(workspaceId);
          break;
        case 'ping':
          result = {};
          break;
        default:
          throw new McpMethodNotFoundError(request.method);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      const isRpcError = error instanceof McpMethodNotFoundError ||
        error instanceof McpInvalidParamsError ||
        error instanceof McpToolNotFoundError;

      const code = isRpcError ? ((error as any).details?.jsonRpcCode ?? -32603) : -32603;
      const message = error instanceof Error ? error.message : 'Internal error';

      this.logger.error(
        { err: error, workspaceId, method: request.method },
        'MCP request error',
      );

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code,
          message,
        },
      };
    }
  }

  // ─── MCP Protocol Handlers ────────────────────────

  private async resolveWorkspaceId(workspaceId: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
    let workspace = await this.db.workspace.findFirst({
      where: isUuid ? { id: workspaceId } : { slug: workspaceId },
    });

    if (!workspace || workspaceId === 'default') {
      const activeWs = await this.db.workspace.findFirst({
        where: { connectorInstances: { some: { status: 'ACTIVE', isEnabled: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      if (activeWs) workspace = activeWs;
    }

    if (!workspace) {
      workspace = await this.db.workspace.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!workspace || !workspace.isActive) {
      throw new NotFoundError('Workspace', workspaceId);
    }

    return workspace.id;
  }

  private async handleInitialize(
    workspaceId: string,
    params?: Record<string, unknown>,
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(workspaceId);

    return {
      protocolVersion: MCP_CONSTANTS.PROTOCOL_VERSION,
      serverInfo: {
        name: MCP_CONSTANTS.SERVER_NAME,
        version: MCP_CONSTANTS.SERVER_VERSION,
      },
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
    };
  }

  private async handleToolsList(
    workspaceId: string,
    params?: Record<string, unknown>,
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(workspaceId);

    // Check cache first using resolved workspace ID
    const cacheKey = `mcp:tools:${resolvedWorkspaceId}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const tools = await this.connectors.getToolsForWorkspace(resolvedWorkspaceId);

    const mcpTools = tools.map((tool) => ({
      name: tool.namespacedName.replace(/\./g, '_'),
      description: `[${tool.connectorName}] ${tool.description}`,
      inputSchema: tool.inputSchema,
    }));

    const result = { tools: mcpTools };

    // Cache for 60 seconds using resolved workspace ID
    await this.redis.setJson(cacheKey, result, 60);

    return result;
  }

  private async handleToolsCall(
    workspaceId: string,
    params?: Record<string, unknown>,
  ) {
    if (!params?.name || typeof params.name !== 'string') {
      throw new McpInvalidParamsError('Missing required parameter: name');
    }

    const resolvedWorkspaceId = await this.resolveWorkspaceId(workspaceId);
    const toolName = params.name;
    const toolArgs = (params.arguments as Record<string, unknown>) || {};

    // Execute the tool with resolved workspace ID
    const result = await this.toolExecution.execute(
      resolvedWorkspaceId,
      toolName,
      toolArgs,
    );

    return result;
  }

  private async handleResourcesList(workspaceId: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(workspaceId);
    // Resources are connector-level metadata
    const instances = await this.connectors.getWorkspaceConnectors(resolvedWorkspaceId);

    const resources = instances.map((inst) => ({
      uri: `connector://${inst.definition.slug}`,
      name: inst.definition.name,
      description: `Connected ${inst.definition.name} instance`,
      mimeType: 'application/json',
    }));

    return { resources };
  }

  private async handlePromptsList(workspaceId: string) {
    return { prompts: [] };
  }

  /**
   * Invalidate the tools cache for a workspace (called when connectors change).
   */
  async invalidateToolsCache(workspaceId: string): Promise<void> {
    await this.redis.del(`mcp:tools:${workspaceId}`);
  }
}
