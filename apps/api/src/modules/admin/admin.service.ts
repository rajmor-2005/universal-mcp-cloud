import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { createLogger } from '@umcp/logger';
import { NotFoundError } from '@umcp/shared';

@Injectable()
export class AdminService {
  private readonly logger = createLogger('AdminService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getDashboardStats() {
    const [userCount, orgCount, workspaceCount, connectorCount, toolExecCount] =
      await Promise.all([
        this.db.user.count(),
        this.db.organization.count(),
        this.db.workspace.count(),
        this.db.connectorInstance.count({ where: { isEnabled: true } }),
        this.db.toolExecution.count(),
      ]);

    return {
      users: userCount,
      organizations: orgCount,
      workspaces: workspaceCount,
      connectedApps: connectorCount,
      toolExecutions: toolExecCount,
    };
  }

  async listUsers(page: number = 1, pageSize: number = 20) {
    const [users, total] = await Promise.all([
      this.db.user.findMany({
        select: {
          id: true, email: true, name: true, isActive: true,
          emailVerified: true, mfaEnabled: true, createdAt: true, lastLoginAt: true,
          _count: { select: { orgMemberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.db.user.count(),
    ]);

    return { users, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async listFeatureFlags() {
    return this.db.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async updateFeatureFlag(key: string, updates: { isEnabled?: boolean; rolloutPercentage?: number }) {
    const flag = await this.db.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundError('Feature flag', key);

    return this.db.featureFlag.update({
      where: { key },
      data: updates,
    });
  }

  async listAnnouncements() {
    return this.db.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(data: {
    title: string;
    content: string;
    type: string;
    expiresAt?: Date;
  }) {
    return this.db.announcement.create({ data });
  }

  async getRecentEvents(limit: number = 50) {
    return this.db.event.findMany({
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
