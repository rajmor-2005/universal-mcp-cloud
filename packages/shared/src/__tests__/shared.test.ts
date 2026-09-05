import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createOrganizationSchema,
  createWorkspaceSchema,
  parseNamespacedTool,
  buildMcpEndpoint,
  AppError,
  NotFoundError,
  AuthenticationError,
} from '../index';

describe('@umcp/shared', () => {
  describe('Zod Validation Schemas', () => {
    it('should validate valid user registration input', () => {
      const valid = {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      };
      const parsed = registerSchema.parse(valid);
      expect(parsed.email).toBe('user@example.com');
    });

    it('should reject invalid emails in registration', () => {
      const invalid = {
        email: 'not-an-email',
        password: 'Password123!',
      };
      expect(() => registerSchema.parse(invalid)).toThrow();
    });

    it('should validate organization creation payload', () => {
      const valid = {
        name: 'Acme Corp',
        slug: 'acme-corp',
      };
      const parsed = createOrganizationSchema.parse(valid);
      expect(parsed.slug).toBe('acme-corp');
    });
  });

  describe('Utility Functions', () => {
    it('should correctly parse namespaced tool strings', () => {
      const parsed = parseNamespacedTool('github.create_issue');
      expect(parsed.connectorSlug).toBe('github');
      expect(parsed.toolName).toBe('create_issue');
    });

    it('should throw on invalid tool name without namespace dot', () => {
      expect(() => parseNamespacedTool('list_repositories')).toThrow();
    });

    it('should build proper MCP workspace endpoint URLs', () => {
      const endpoint = buildMcpEndpoint('http://localhost:4000/mcp', 'ws_999');
      expect(endpoint).toBe('http://localhost:4000/mcp/u/ws_999');
    });
  });

  describe('Custom Error Hierarchy', () => {
    it('should instantiate AppErrors with correct HTTP status codes', () => {
      const notFound = new NotFoundError('Workspace', 'ws_123');
      expect(notFound.statusCode).toBe(404);
      expect(notFound.code).toBe('NOT_FOUND');

      const authErr = new AuthenticationError('Invalid credentials');
      expect(authErr.statusCode).toBe(401);
      expect(authErr.code).toBe('AUTH_REQUIRED');
    });
  });
});
