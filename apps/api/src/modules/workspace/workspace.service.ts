import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventService } from '../event/event.service';
import { createLogger } from '@umcp/logger';
import { getConfig } from '@umcp/config';
import {
  NotFoundError,
  DuplicateError,
  ForbiddenError,
  PlanLimitExceededError,
  EventType,
  PLAN_LIMITS,
  SubscriptionPlan,
  AUTH_CONSTANTS,
  type UserId,
  type WorkspaceId,
} from '@umcp/shared';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@umcp/shared';
import { generateApiKey, buildMcpEndpoint, maskSecret } from '@umcp/shared';
import { createHmacSignature } from '@umcp/crypto';

@Injectable()
export class WorkspaceService {
  private readonly logger = createLogger('WorkspaceService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly events: EventService,
  ) {}

  async create(orgId: string, userId: string, input: CreateWorkspaceInput) {
    // Check plan limits
    const sub = await this.db.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    const plan = (sub?.plan as SubscriptionPlan) || SubscriptionPlan.FREE;
    const limits = PLAN_LIMITS[plan];
    const wsCount = await this.db.workspace.count({ where: { organizationId: orgId } });

    if (wsCount >= limits.maxWorkspaces) {
      throw new PlanLimitExceededError('workspaces', plan);
    }

    const existing = await this.db.workspace.findUnique({
      where: { organizationId_slug: { organizationId: orgId, slug: input.slug } },
    });
    if (existing) throw new DuplicateError('Workspace', 'slug', input.slug);

    const config = getConfig();
    const workspace = await this.db.workspace.create({
      data: {
        name: input.name,
        slug: input.slug,
        organizationId: orgId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
    });

    // Set MCP endpoint
    const mcpEndpoint = buildMcpEndpoint(config.MCP_ENDPOINT_BASE, workspace.id);
    await this.db.workspace.update({
      where: { id: workspace.id },
      data: { mcpEndpoint },
    });

    await this.events.emit({
      type: EventType.WORKSPACE_CREATED,
      actorId: userId as UserId,
      workspaceId: workspace.id as WorkspaceId,
    });

    return { ...workspace, mcpEndpoint };
  }

  async findById(workspaceId: string, userId: string) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        },
        connectorInstances: {
          include: { definition: { select: { name: true, slug: true, iconUrl: true, category: true } } },
        },
        _count: { select: { members: true, connectorInstances: true, toolExecutions: true } },
      },
    });

    if (!workspace) throw new NotFoundError('Workspace', workspaceId);

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenError();

    return workspace;
  }

  async findByOrg(orgId: string, userId: string) {
    // Verify org membership
    const orgMember = await this.db.orgMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!orgMember) throw new ForbiddenError();

    return this.db.workspace.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        _count: { select: { members: true, connectorInstances: true } },
      },
    });
  }

  async update(workspaceId: string, userId: string, input: UpdateWorkspaceInput) {
    const workspace = await this.db.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundError('Workspace', workspaceId);

    return this.db.workspace.update({
      where: { id: workspaceId },
      data: input,
    });
  }

  async delete(workspaceId: string, userId: string) {
    await this.db.workspace.update({
      where: { id: workspaceId },
      data: { isActive: false },
    });

    await this.events.emit({
      type: EventType.WORKSPACE_DELETED,
      actorId: userId as UserId,
      workspaceId: workspaceId as WorkspaceId,
    });
  }

  // ─── API Keys ─────────────────────────────────────

  async createApiKey(workspaceId: string, userId: string, name: string, expiresAt?: Date) {
    const { key, hash } = generateApiKey();
    const keyHash = createHmacSignature(key, getConfig().JWT_SECRET);

    const apiKey = await this.db.apiKey.create({
      data: {
        userId,
        workspaceId,
        name,
        keyPrefix: key.slice(0, 12),
        keyHash,
        expiresAt: expiresAt || null,
      },
    });

    await this.events.emit({
      type: EventType.API_KEY_CREATED,
      actorId: userId as UserId,
      workspaceId: workspaceId as WorkspaceId,
      resourceType: 'ApiKey',
      resourceId: apiKey.id,
    });

    // Return the full key only once
    return {
      id: apiKey.id,
      name: apiKey.name,
      key,
      keyPrefix: apiKey.keyPrefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async listApiKeys(workspaceId: string) {
    return this.db.apiKey.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(apiKeyId: string, userId: string) {
    const apiKey = await this.db.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });

    await this.events.emit({
      type: EventType.API_KEY_REVOKED,
      actorId: userId as UserId,
      resourceType: 'ApiKey',
      resourceId: apiKeyId,
    });

    return apiKey;
  }

  // ─── Members ──────────────────────────────────────

  async addMember(workspaceId: string, userId: string, targetUserId: string, role: string) {
    await this.db.workspaceMember.create({
      data: { userId: targetUserId, workspaceId, role },
    });

    await this.events.emit({
      type: EventType.WORKSPACE_MEMBER_ADDED,
      actorId: userId as UserId,
      workspaceId: workspaceId as WorkspaceId,
      metadata: { addedUserId: targetUserId, role },
    });
  }

  async removeMember(workspaceId: string, userId: string, targetUserId: string) {
    await this.db.workspaceMember.deleteMany({
      where: { workspaceId, userId: targetUserId },
    });

    await this.events.emit({
      type: EventType.WORKSPACE_MEMBER_REMOVED,
      actorId: userId as UserId,
      workspaceId: workspaceId as WorkspaceId,
      metadata: { removedUserId: targetUserId },
    });
  }

  // ─── Execution Logs ───────────────────────────────

  async getLogs(workspaceId: string, userId: string, limit: number = 50) {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) throw new NotFoundError('Workspace', workspaceId);

    return this.db.toolExecution.findMany({
      where: { workspaceId },
      include: {
        toolDefinition: { select: { namespacedName: true, name: true } },
        connectorInstance: { include: { definition: { select: { name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

