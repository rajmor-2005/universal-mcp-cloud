/**
 * @umcp/shared — Core types for Universal MCP Cloud
 */

// ─── User & Auth ────────────────────────────────────

export type UserId = string & { readonly __brand: 'UserId' };
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type ConnectorInstanceId = string & { readonly __brand: 'ConnectorInstanceId' };
export type ConnectorDefinitionId = string & { readonly __brand: 'ConnectorDefinitionId' };
export type ApiKeyId = string & { readonly __brand: 'ApiKeyId' };
export type SecretId = string & { readonly __brand: 'SecretId' };
export type ToolId = string & { readonly __brand: 'ToolId' };
export type EventId = string & { readonly __brand: 'EventId' };
export type SubscriptionId = string & { readonly __brand: 'SubscriptionId' };
export type WebhookEndpointId = string & { readonly __brand: 'WebhookEndpointId' };

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  MAGIC_LINK = 'MAGIC_LINK',
  PASSKEY = 'PASSKEY',
}

export enum MfaMethod {
  TOTP = 'TOTP',
  WEBAUTHN = 'WEBAUTHN',
}

export interface UserProfile {
  id: UserId;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: UserId;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

// ─── Organizations & Workspaces ─────────────────────

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Organization {
  id: OrganizationId;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: UserId;
  plan: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  organizationId: OrganizationId;
  mcpEndpoint: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: UserId;
  workspaceId: WorkspaceId;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: OrganizationId;
  workspaceId: WorkspaceId | null;
  role: OrgRole;
  invitedBy: UserId;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

// ─── Connectors ─────────────────────────────────────

export enum ConnectorAuthType {
  OAUTH2 = 'OAUTH2',
  API_KEY = 'API_KEY',
  BEARER_TOKEN = 'BEARER_TOKEN',
  BASIC_AUTH = 'BASIC_AUTH',
  CUSTOM = 'CUSTOM',
  NONE = 'NONE',
}

export enum ConnectorCategory {
  DEVELOPER_TOOLS = 'DEVELOPER_TOOLS',
  COMMUNICATION = 'COMMUNICATION',
  PRODUCTIVITY = 'PRODUCTIVITY',
  PAYMENTS = 'PAYMENTS',
  FINANCE = 'FINANCE',
  COMMERCE = 'COMMERCE',
  CRM = 'CRM',
  CLOUD = 'CLOUD',
  AI = 'AI',
  STORAGE = 'STORAGE',
  DATABASES = 'DATABASES',
  ANALYTICS = 'ANALYTICS',
  MARKETING = 'MARKETING',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  CUSTOM_API = 'CUSTOM_API',
  CUSTOM = 'CUSTOM',
}

export enum ConnectorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  CONFIGURING = 'CONFIGURING',
}

export interface ConnectorDefinition {
  id: ConnectorDefinitionId;
  name: string;
  slug: string;
  description: string;
  iconUrl: string;
  category: ConnectorCategory;
  authType: ConnectorAuthType;
  version: string;
  isOfficial: boolean;
  isPublic: boolean;
  toolCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectorInstance {
  id: ConnectorInstanceId;
  workspaceId: WorkspaceId;
  definitionId: ConnectorDefinitionId;
  status: ConnectorStatus;
  displayName: string;
  config: Record<string, unknown>;
  lastHealthCheck: Date | null;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Tools ──────────────────────────────────────────

export interface ToolDefinition {
  id: ToolId;
  connectorDefinitionId: ConnectorDefinitionId;
  name: string;
  namespacedName: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema | null;
  isEnabled: boolean;
  category: string | null;
  version: string;
  metadata: Record<string, unknown>;
}

export interface ToolExecution {
  id: string;
  toolId: ToolId;
  workspaceId: WorkspaceId;
  connectorInstanceId: ConnectorInstanceId;
  userId: UserId | null;
  input: Record<string, unknown>;
  output: unknown;
  status: ToolExecutionStatus;
  latencyMs: number;
  errorMessage: string | null;
  createdAt: Date;
}

export enum ToolExecutionStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

// ─── Billing ────────────────────────────────────────

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIALING = 'TRIALING',
  PAUSED = 'PAUSED',
}

export interface PlanLimits {
  maxConnectedApps: number;
  maxToolCallsPerMonth: number;
  maxWorkspaces: number;
  maxSeats: number;
  maxStorageMb: number;
  analyticsRetentionDays: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated' | 'custom';
}

export interface Subscription {
  id: SubscriptionId;
  organizationId: OrganizationId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  organizationId: OrganizationId;
  period: string;
  toolCalls: number;
  connectedApps: number;
  storageUsedMb: number;
  activeSeats: number;
}

// ─── Events ─────────────────────────────────────────

export enum EventType {
  // Auth
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGGED_IN = 'USER_LOGGED_IN',
  USER_LOGGED_OUT = 'USER_LOGGED_OUT',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',

  // Organization
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  ORG_MEMBER_ADDED = 'ORG_MEMBER_ADDED',
  ORG_MEMBER_REMOVED = 'ORG_MEMBER_REMOVED',
  ORG_MEMBER_ROLE_CHANGED = 'ORG_MEMBER_ROLE_CHANGED',

  // Workspace
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  WORKSPACE_DELETED = 'WORKSPACE_DELETED',
  WORKSPACE_MEMBER_ADDED = 'WORKSPACE_MEMBER_ADDED',
  WORKSPACE_MEMBER_REMOVED = 'WORKSPACE_MEMBER_REMOVED',

  // Connector
  CONNECTOR_CONNECTED = 'CONNECTOR_CONNECTED',
  CONNECTOR_DISCONNECTED = 'CONNECTOR_DISCONNECTED',
  CONNECTOR_ERROR = 'CONNECTOR_ERROR',
  CONNECTOR_HEALTH_CHECK = 'CONNECTOR_HEALTH_CHECK',
  OAUTH_TOKEN_REFRESHED = 'OAUTH_TOKEN_REFRESHED',
  OAUTH_TOKEN_EXPIRED = 'OAUTH_TOKEN_EXPIRED',

  // Tool
  TOOL_EXECUTED = 'TOOL_EXECUTED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',

  // Billing
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  USAGE_LIMIT_APPROACHING = 'USAGE_LIMIT_APPROACHING',
  USAGE_LIMIT_REACHED = 'USAGE_LIMIT_REACHED',

  // Webhook
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_DELIVERED = 'WEBHOOK_DELIVERED',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',

  // Security
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  SECRET_ACCESSED = 'SECRET_ACCESSED',
  SECRET_ROTATED = 'SECRET_ROTATED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // Admin
  FEATURE_FLAG_CHANGED = 'FEATURE_FLAG_CHANGED',
  ANNOUNCEMENT_CREATED = 'ANNOUNCEMENT_CREATED',
}

export interface PlatformEvent {
  id: EventId;
  type: EventType;
  actorId: UserId | null;
  organizationId: OrganizationId | null;
  workspaceId: WorkspaceId | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

// ─── API Response ───────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── MCP Types ──────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

// ─── JSON Schema ────────────────────────────────────

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

// ─── Webhook ────────────────────────────────────────

export interface WebhookEndpoint {
  id: WebhookEndpointId;
  workspaceId: WorkspaceId;
  url: string;
  secret: string;
  events: EventType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

// ─── Feature Flags ──────────────────────────────────

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetOrgs: OrganizationId[];
  metadata: Record<string, unknown>;
}
