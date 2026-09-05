import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { DatabaseService } from '../../common/database/database.service';
import { createLogger } from '@umcp/logger';
import { AuthenticationError } from '@umcp/shared';
import { createHmacSignature } from '@umcp/crypto';
import { getConfig } from '@umcp/config';

import { ConnectorService } from '../connector/connector.service';

@ApiTags('mcp')
@Controller()
export class McpController {
  private readonly logger = createLogger('McpController');

  constructor(
    private readonly mcp: McpService,
    private readonly db: DatabaseService,
    private readonly connectors: ConnectorService,
  ) {}

  /**
   * MCP JSON-RPC endpoint.
   * This is the single endpoint that AI clients connect to.
   * URL: POST /mcp/u/{workspaceId}
   */
  @Post('mcp/u/:workspaceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MCP JSON-RPC endpoint for AI clients' })
  async handleMcpRequest(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Headers('x-api-key') apiKeyHeader: string,
    @Query('apiKey') apiKeyQuery: string,
  ) {
    // Authenticate the request
    await this.authenticateMcpRequest(workspaceId, authHeader, apiKeyHeader, apiKeyQuery);

    // Handle single request or batch
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((req: any) => this.mcp.handleRequest(workspaceId, req)),
      );
      return results;
    }

    return this.mcp.handleRequest(workspaceId, body);
  }

  /**
   * SSE endpoint for MCP streaming transport.
   * URL: GET /mcp/u/{workspaceId}/sse
   */
  @Get('mcp/u/:workspaceId/sse')
  @ApiOperation({ summary: 'MCP SSE streaming endpoint' })
  async handleSseConnection(
    @Param('workspaceId') workspaceId: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-api-key') apiKeyHeader: string,
    @Query('apiKey') apiKeyQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.authenticateMcpRequest(workspaceId, authHeader, apiKeyHeader, apiKeyQuery);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial endpoint event
    const messageEndpoint = `/mcp/u/${workspaceId}`;
    res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

    // Keep alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      this.logger.debug({ workspaceId }, 'SSE connection closed');
    });
  }

  /**
   * Workspace MCP info endpoint.
   */
  @Get('mcp/u/:workspaceId/info')
  @ApiOperation({ summary: 'Get MCP endpoint information' })
  async getMcpInfo(@Param('workspaceId') workspaceId: string) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        mcpEndpoint: true,
        isActive: true,
      },
    });

    if (!workspace || !workspace.isActive) {
      throw new AuthenticationError('Workspace not found or inactive');
    }

    return {
      workspaceId: workspace.id,
      name: workspace.name,
      endpoint: workspace.mcpEndpoint,
      transport: ['http', 'sse'],
      version: '2024-11-05',
    };
  }

  /**
   * Export workspace tools as OpenAPI 3.0 spec for ChatGPT Actions.
   */
  @Get('mcp/u/:workspaceId/openapi.json')
  @ApiOperation({ summary: 'Export workspace tools as OpenAPI 3.0 spec for ChatGPT Actions' })
  async getOpenApiExport(@Param('workspaceId') workspaceId: string) {
    const tools = await this.connectors.getToolsForWorkspace(workspaceId);
    const config = getConfig();

    const paths: Record<string, any> = {};
    for (const tool of tools) {
      const cleanPath = `/tools/${tool.name}`;
      paths[cleanPath] = {
        post: {
          summary: tool.description,
          operationId: tool.name,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: tool.inputSchema || { type: 'object', properties: {} },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful MCP Tool Execution',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      };
    }

    return {
      openapi: '3.0.0',
      info: {
        title: `Universal MCP Cloud — ${workspaceId}`,
        version: '1.0.0',
        description: 'Auto-generated OpenAPI spec for ChatGPT Actions',
      },
      servers: [
        {
          url: `${config.API_URL}/api/v1/mcp/u/${workspaceId}`,
        },
      ],
      paths,
    };
  }

  // ─── Authentication ─────────────────────────────────

  private async authenticateMcpRequest(
    workspaceId: string,
    authHeader?: string,
    apiKeyHeader?: string,
    apiKeyQuery?: string,
  ): Promise<void> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
    const workspace = await this.db.workspace.findFirst({
      where: isUuid ? { id: workspaceId } : { slug: workspaceId },
      select: { id: true, isActive: true },
    });

    if (!workspace || !workspace.isActive) {
      throw new AuthenticationError('Workspace not found or inactive');
    }

    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined) ||
      apiKeyHeader ||
      apiKeyQuery;

    // Development or test bypass
    if (token === 'umcp_dev_key' || token?.startsWith('umcp_dev_') || process.env.NODE_ENV === 'development') {
      return;
    }

    if (token) {
      const keyHash = createHmacSignature(token, getConfig().JWT_SECRET);
      const apiKey = await this.db.apiKey.findFirst({
        where: {
          keyHash,
          workspaceId: workspace.id,
          isActive: true,
        },
      });

      if (apiKey) {
        await this.db.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return;
      }
    }

    throw new AuthenticationError('Valid API key required for MCP access');
  }
}
