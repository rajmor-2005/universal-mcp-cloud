/**
 * @umcp/shared — Zod validation schemas for API request/response payloads.
 */

import { z } from 'zod';
import {
  AuthProvider,
  ConnectorAuthType,
  ConnectorCategory,
  ConnectorStatus,
  EventType,
  InvitationStatus,
  MfaMethod,
  OrgRole,
  SubscriptionPlan,
  SubscriptionStatus,
  ToolExecutionStatus,
  WorkspaceRole,
} from '../types/index';

// ─── Primitives ─────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').max(255).toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const nameSchema = z.string().min(1).max(100).trim();

export const slugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    'Slug must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
  );

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(500).trim(),
});

// ─── Auth Schemas ───────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const sendOtpSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().length(6).regex(/^\d+$/, 'OTP code must be 6 digits'),
  name: nameSchema.optional(),
});

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

export const mfaSetupSchema = z.object({
  method: z.nativeEnum(MfaMethod),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const passkeyRegisterOptionsSchema = z.object({
  displayName: nameSchema.optional(),
});

export const passkeyRegisterVerifySchema = z.object({
  credential: z.record(z.unknown()),
});

export const passkeyLoginOptionsSchema = z.object({
  email: emailSchema.optional(),
});

export const passkeyLoginVerifySchema = z.object({
  credential: z.record(z.unknown()),
});

// ─── Organization Schemas ───────────────────────────

export const createOrganizationSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
});

export const updateOrganizationSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(OrgRole).default(OrgRole.MEMBER),
  workspaceIds: z.array(uuidSchema).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});

// ─── Workspace Schemas ──────────────────────────────

export const createWorkspaceSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
});

export const updateWorkspaceSchema = z.object({
  name: nameSchema.optional(),
  slug: slugSchema.optional(),
});

export const addWorkspaceMemberSchema = z.object({
  userId: uuidSchema,
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});

// ─── API Key Schemas ────────────────────────────────

export const createApiKeySchema = z.object({
  name: nameSchema,
  expiresAt: z.coerce.date().optional(),
  scopes: z.array(z.string()).optional(),
});

// ─── Connector Schemas ──────────────────────────────

export const connectConnectorSchema = z.object({
  connectorDefinitionId: uuidSchema,
  displayName: nameSchema.optional(),
  config: z.record(z.unknown()).optional(),
  credentials: z
    .object({
      apiKey: z.string().optional(),
      bearerToken: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      custom: z.record(z.string()).optional(),
    })
    .optional(),
});

export const updateConnectorInstanceSchema = z.object({
  displayName: nameSchema.optional(),
  config: z.record(z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
});

export const connectorDefinitionSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  description: z.string().min(1).max(1000),
  iconUrl: z.string().url(),
  category: z.nativeEnum(ConnectorCategory),
  authType: z.nativeEnum(ConnectorAuthType),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  oauthConfig: z
    .object({
      authorizationUrl: z.string().url(),
      tokenUrl: z.string().url(),
      scopes: z.array(z.string()),
      clientId: z.string(),
      clientSecret: z.string(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Billing Schemas ────────────────────────────────

export const createCheckoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan).refine((p) => p !== SubscriptionPlan.FREE, {
    message: 'Cannot create checkout for free plan',
  }),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});

// ─── Webhook Schemas ────────────────────────────────

export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
  events: z.array(z.nativeEnum(EventType)).min(1),
});

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.nativeEnum(EventType)).min(1).optional(),
  isActive: z.boolean().optional(),
});

// ─── Log / Search Schemas ───────────────────────────

export const logSearchSchema = paginationSchema.extend({
  workspaceId: uuidSchema.optional(),
  connectorId: uuidSchema.optional(),
  toolName: z.string().optional(),
  status: z.nativeEnum(ToolExecutionStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ─── Admin Schemas ──────────────────────────────────

export const featureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  name: nameSchema,
  description: z.string().max(500),
  isEnabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  targetOrgs: z.array(uuidSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  type: z.enum(['info', 'warning', 'maintenance', 'feature']),
  isActive: z.boolean().default(true),
  expiresAt: z.coerce.date().optional(),
});

// Re-export Zod types for convenience
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ConnectConnectorInput = z.infer<typeof connectConnectorSchema>;
export type UpdateConnectorInstanceInput = z.infer<typeof updateConnectorInstanceSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreateWebhookEndpointInput = z.infer<typeof createWebhookEndpointSchema>;
export type LogSearchInput = z.infer<typeof logSearchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;
