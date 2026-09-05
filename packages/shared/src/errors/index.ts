/**
 * @umcp/shared — Structured error hierarchy for the platform.
 * All errors extend AppError and carry a machine-readable code.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ─── Authentication Errors ──────────────────────────

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 'AUTH_REQUIRED', 401, details);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 'INVALID_CREDENTIALS', 401);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 'INVALID_TOKEN', 401);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is temporarily locked due to too many failed attempts') {
    super(message, 'ACCOUNT_LOCKED', 423);
  }
}

export class MfaRequiredError extends AppError {
  constructor(public readonly mfaToken: string) {
    super('MFA verification required', 'MFA_REQUIRED', 403, { mfaToken });
  }
}

export class MfaInvalidError extends AppError {
  constructor(message = 'Invalid MFA code') {
    super(message, 'MFA_INVALID', 401);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = 'Email address has not been verified') {
    super(message, 'EMAIL_NOT_VERIFIED', 403);
  }
}

// ─── Authorization Errors ───────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class InsufficientRoleError extends AppError {
  constructor(requiredRole: string) {
    super(
      `This action requires the '${requiredRole}' role`,
      'INSUFFICIENT_ROLE',
      403,
      { requiredRole },
    );
  }
}

export class WorkspaceAccessDeniedError extends AppError {
  constructor(workspaceId: string) {
    super(
      'You do not have access to this workspace',
      'WORKSPACE_ACCESS_DENIED',
      403,
      { workspaceId },
    );
  }
}

// ─── Resource Errors ────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, id },
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      'DUPLICATE',
      409,
      { resource, field, value },
    );
  }
}

// ─── Validation Errors ──────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}

// ─── Rate Limiting Errors ───────────────────────────

export class RateLimitError extends AppError {
  constructor(
    retryAfterSeconds: number,
    message = 'Too many requests, please try again later',
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfterSeconds });
  }
}

// ─── Billing Errors ─────────────────────────────────

export class PlanLimitExceededError extends AppError {
  constructor(limit: string, currentPlan: string) {
    super(
      `You have reached the ${limit} limit on the ${currentPlan} plan. Please upgrade to continue.`,
      'PLAN_LIMIT_EXCEEDED',
      402,
      { limit, currentPlan },
    );
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment is required to access this feature') {
    super(message, 'PAYMENT_REQUIRED', 402);
  }
}

export class SubscriptionInactiveError extends AppError {
  constructor(message = 'Your subscription is not active') {
    super(message, 'SUBSCRIPTION_INACTIVE', 402);
  }
}

// ─── Connector Errors ───────────────────────────────

export class ConnectorError extends AppError {
  constructor(
    connectorName: string,
    message: string,
    details?: unknown,
  ) {
    super(
      `Connector '${connectorName}': ${message}`,
      'CONNECTOR_ERROR',
      502,
      { connectorName, ...((details as object) || {}) },
    );
  }
}

export class ConnectorAuthError extends AppError {
  constructor(connectorName: string, message = 'Authentication failed') {
    super(
      `Connector '${connectorName}': ${message}`,
      'CONNECTOR_AUTH_ERROR',
      502,
      { connectorName },
    );
  }
}

export class ConnectorTimeoutError extends AppError {
  constructor(connectorName: string, timeoutMs: number) {
    super(
      `Connector '${connectorName}' timed out after ${timeoutMs}ms`,
      'CONNECTOR_TIMEOUT',
      504,
      { connectorName, timeoutMs },
    );
  }
}

export class ConnectorRateLimitError extends AppError {
  constructor(connectorName: string, retryAfterMs: number) {
    super(
      `Connector '${connectorName}' is rate limited`,
      'CONNECTOR_RATE_LIMITED',
      429,
      { connectorName, retryAfterMs },
    );
  }
}

// ─── MCP Errors ─────────────────────────────────────

export class McpError extends AppError {
  constructor(message: string, code: number = -32603, details?: unknown) {
    super(message, `MCP_ERROR_${code}`, 500, { jsonRpcCode: code, ...((details as object) || {}) });
  }
}

export class McpMethodNotFoundError extends McpError {
  constructor(method: string) {
    super(`Method '${method}' not found`, -32601, { method });
  }
}

export class McpInvalidParamsError extends McpError {
  constructor(message: string, details?: unknown) {
    super(message, -32602, details);
  }
}

export class McpToolNotFoundError extends McpError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found`, -32602, { toolName });
  }
}

// ─── Infrastructure Errors ──────────────────────────

export class InternalError extends AppError {
  constructor(message = 'An internal error occurred', details?: unknown) {
    super(message, 'INTERNAL_ERROR', 500, details, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(
      `Service '${service}' is temporarily unavailable`,
      'SERVICE_UNAVAILABLE',
      503,
      { service },
    );
  }
}

export class EncryptionError extends AppError {
  constructor(message = 'Encryption operation failed') {
    super(message, 'ENCRYPTION_ERROR', 500, undefined, false);
  }
}
