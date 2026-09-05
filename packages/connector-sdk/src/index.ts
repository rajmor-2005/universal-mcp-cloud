/**
 * @umcp/connector-sdk — SDK for building enterprise connectors for Universal MCP Cloud.
 */

import { JsonSchema } from '@umcp/shared';

export interface ToolExecutionContext {
  workspaceId: string;
  connectorInstanceId: string;
  credentials: Record<string, string>;
  config: Record<string, unknown>;
}

export interface ConnectorToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  execute?: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<unknown>;
}

export interface ConnectorAction {
  name: string;
  displayName: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface ConnectorTrigger {
  name: string;
  displayName: string;
  description: string;
  type: 'POLLING' | 'WEBHOOK';
  eventSchema: JsonSchema;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string;
  category: string;
  authType: 'OAUTH2' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'CUSTOM' | 'NONE';
  version: string;
  isOfficial?: boolean;
  documentationUrl?: string;
  actions?: ConnectorAction[];
  triggers?: ConnectorTrigger[];
  rateLimit?: { requestsPerMinute: number };
}

export abstract class BaseConnector {
  abstract readonly metadata: ConnectorMetadata;
  abstract readonly tools: ConnectorToolDefinition[];

  async onConnect?(ctx: ToolExecutionContext): Promise<void>;
  async onDisconnect?(ctx: ToolExecutionContext): Promise<void>;
  async healthCheck?(ctx: ToolExecutionContext): Promise<{ isHealthy: boolean; message?: string }>;
}

export function createTool(tool: ConnectorToolDefinition): ConnectorToolDefinition {
  return tool;
}

/**
 * Global Connector Registry for auto-registration and hot-loading.
 */
export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors = new Map<string, BaseConnector>();

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  public register(connector: BaseConnector): void {
    this.connectors.set(connector.metadata.slug, connector);
  }

  public get(slug: string): BaseConnector | undefined {
    return this.connectors.get(slug);
  }

  public list(): BaseConnector[] {
    return Array.from(this.connectors.values());
  }
}
