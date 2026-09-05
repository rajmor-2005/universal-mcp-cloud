import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { createLogger } from '@umcp/logger';
import { EventType, EVENT_CONSTANTS } from '@umcp/shared';
import type { UserId, WorkspaceId, OrganizationId } from '@umcp/shared';

interface EmitEventParams {
  type: EventType;
  actorId?: UserId | null;
  workspaceId?: WorkspaceId | null;
  organizationId?: OrganizationId | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class EventService {
  private readonly logger = createLogger('EventService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async emit(params: EmitEventParams): Promise<void> {
    try {
      // Persist to database
      const event = await this.db.event.create({
        data: {
          type: params.type,
          actorId: (params.actorId as string) || null,
          workspaceId: (params.workspaceId as string) || null,
          resourceType: params.resourceType || null,
          resourceId: params.resourceId || null,
          metadata: (params.metadata as any) || undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });

      // Publish to Redis for real-time subscribers
      await this.redis.publish(
        EVENT_CONSTANTS.EVENTS_CHANNEL,
        JSON.stringify({
          id: event.id,
          type: params.type,
          actorId: params.actorId,
          workspaceId: params.workspaceId,
          metadata: params.metadata,
          timestamp: event.createdAt.toISOString(),
        }),
      );

      this.logger.debug(
        { eventType: params.type, actorId: params.actorId },
        'Event emitted',
      );
    } catch (error) {
      this.logger.error({ err: error, eventType: params.type }, 'Failed to emit event');
    }
  }

  async getEvents(filters: {
    workspaceId?: string;
    type?: EventType;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters.type) where.type = filters.type;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;

    const [events, total] = await Promise.all([
      this.db.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          actor: { select: { id: true, email: true, name: true } },
        },
      }),
      this.db.event.count({ where }),
    ]);

    return {
      events,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
