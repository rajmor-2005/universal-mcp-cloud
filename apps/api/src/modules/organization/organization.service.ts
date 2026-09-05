import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { EventService } from '../event/event.service';
import { createLogger } from '@umcp/logger';
import {
  NotFoundError,
  DuplicateError,
  ForbiddenError,
  EventType,
  PLAN_LIMITS,
  SubscriptionPlan,
} from '@umcp/shared';
import type {
  UserId,
  OrganizationId,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  InviteMemberInput,
} from '@umcp/shared';
import { generateUrlSafeToken } from '@umcp/crypto';
import { createHmacSignature } from '@umcp/crypto';
import { getConfig } from '@umcp/config';

@Injectable()
export class OrganizationService {
  private readonly logger = createLogger('OrganizationService');

  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventService,
  ) {}

  async create(userId: string, input: CreateOrganizationInput) {
    const existing = await this.db.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new DuplicateError('Organization', 'slug', input.slug);
    }

    const org = await this.db.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    // Create free subscription
    await this.db.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    await this.events.emit({
      type: EventType.ORG_CREATED,
      actorId: userId as UserId,
      organizationId: org.id as OrganizationId,
      resourceType: 'Organization',
      resourceId: org.id,
    });

    return org;
  }

  async findById(orgId: string, userId: string) {
    const org = await this.db.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        },
        workspaces: {
          select: { id: true, name: true, slug: true, isActive: true, createdAt: true },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { members: true, workspaces: true } },
      },
    });

    if (!org) throw new NotFoundError('Organization', orgId);

    // Verify membership
    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenError();

    return org;
  }

  async findByUser(userId: string) {
    const memberships = await this.db.orgMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: { select: { members: true, workspaces: true } },
            subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));
  }

  async update(orgId: string, userId: string, input: UpdateOrganizationInput) {
    await this.verifyRole(orgId, userId, 'ADMIN');

    if (input.slug) {
      const existing = await this.db.organization.findFirst({
        where: { slug: input.slug, id: { not: orgId } },
      });
      if (existing) throw new DuplicateError('Organization', 'slug', input.slug);
    }

    const org = await this.db.organization.update({
      where: { id: orgId },
      data: input,
    });

    await this.events.emit({
      type: EventType.ORG_UPDATED,
      actorId: userId as UserId,
      organizationId: orgId as OrganizationId,
    });

    return org;
  }

  async inviteMember(orgId: string, userId: string, input: InviteMemberInput) {
    await this.verifyRole(orgId, userId, 'ADMIN');

    const existing = await this.db.orgMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email: input.email },
      },
    });

    if (existing) {
      throw new DuplicateError('Organization member', 'email', input.email);
    }

    const token = generateUrlSafeToken(32);
    const config = getConfig();
    const tokenHash = createHmacSignature(token, config.JWT_SECRET);

    const invitation = await this.db.invitation.create({
      data: {
        email: input.email,
        organizationId: orgId,
        role: input.role || 'MEMBER',
        invitedById: userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const inviteUrl = `${config.APP_URL}/invite/${token}`;
    this.logger.info({ email: input.email, inviteUrl }, 'Invitation created (dev mode)');

    return invitation;
  }

  async removeMember(orgId: string, userId: string, memberUserId: string) {
    await this.verifyRole(orgId, userId, 'ADMIN');

    const org = await this.db.organization.findUnique({ where: { id: orgId } });
    if (org?.ownerId === memberUserId) {
      throw new ForbiddenError('Cannot remove the organization owner');
    }

    await this.db.orgMember.deleteMany({
      where: { organizationId: orgId, userId: memberUserId },
    });

    // Also remove from all workspaces in this org
    const workspaces = await this.db.workspace.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    for (const ws of workspaces) {
      await this.db.workspaceMember.deleteMany({
        where: { workspaceId: ws.id, userId: memberUserId },
      });
    }

    await this.events.emit({
      type: EventType.ORG_MEMBER_REMOVED,
      actorId: userId as UserId,
      organizationId: orgId as OrganizationId,
      metadata: { removedUserId: memberUserId },
    });
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    memberUserId: string,
    role: string,
  ) {
    await this.verifyRole(orgId, userId, 'OWNER');

    await this.db.orgMember.updateMany({
      where: { organizationId: orgId, userId: memberUserId },
      data: { role },
    });

    await this.events.emit({
      type: EventType.ORG_MEMBER_ROLE_CHANGED,
      actorId: userId as UserId,
      organizationId: orgId as OrganizationId,
      metadata: { memberUserId, newRole: role },
    });
  }

  private async verifyRole(orgId: string, userId: string, requiredRole: string) {
    const membership = await this.db.orgMember.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });

    if (!membership) throw new ForbiddenError();

    const hierarchy: Record<string, number> = {
      VIEWER: 0,
      MEMBER: 1,
      ADMIN: 2,
      OWNER: 3,
    };

    if ((hierarchy[membership.role] ?? -1) < (hierarchy[requiredRole] ?? Infinity)) {
      throw new ForbiddenError();
    }
  }
}
