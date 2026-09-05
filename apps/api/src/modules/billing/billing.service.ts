import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventService } from '../event/event.service';
import { createLogger } from '@umcp/logger';
import { getConfig } from '@umcp/config';
import {
  NotFoundError,
  PaymentRequiredError,
  EventType,
  PLAN_LIMITS,
  SubscriptionPlan,
  getUsagePeriod,
  type UserId,
  type OrganizationId,
} from '@umcp/shared';

@Injectable()
export class BillingService {
  private readonly logger = createLogger('BillingService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly events: EventService,
  ) {}

  async getSubscription(orgId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
    const org = await this.db.organization.findFirst({ where: isUuid ? { id: orgId } : { slug: orgId } });
    const realOrgId = org ? org.id : orgId;

    const sub = await this.db.subscription.findFirst({
      where: { organizationId: realOrgId },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) throw new NotFoundError('Subscription');

    const limits = PLAN_LIMITS[sub.plan as SubscriptionPlan];
    const usage = await this.getUsage(realOrgId);

    return {
      subscription: sub,
      limits,
      usage,
    };
  }

  async getUsage(orgId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
    const org = await this.db.organization.findFirst({ where: isUuid ? { id: orgId } : { slug: orgId } });
    const realOrgId = org ? org.id : orgId;

    const period = getUsagePeriod();

    // Get from Redis for real-time data
    const toolCallsKey = `usage:${realOrgId}:${period}:toolCalls`;
    const toolCalls = parseInt((await this.redis.get(toolCallsKey)) || '0', 10);

    // Get from DB for other metrics
    const connectedApps = await this.db.connectorInstance.count({
      where: {
        workspace: { organizationId: realOrgId },
        isEnabled: true,
      },
    });

    const activeSeats = await this.db.orgMember.count({
      where: { organizationId: realOrgId },
    });

    return {
      period,
      toolCalls,
      connectedApps,
      activeSeats,
      storageUsedMb: 0,
    };
  }

  async createCheckoutSession(
    orgId: string,
    userId: string,
    plan: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string,
  ) {
    const config = getConfig();

    if (!config.STRIPE_SECRET_KEY) {
      // Development mode — directly upgrade
      return this.devUpgrade(orgId, userId, plan);
    }

    // In production, this would create a Stripe checkout session
    // For now, return the dev upgrade
    return this.devUpgrade(orgId, userId, plan);
  }

  private async devUpgrade(orgId: string, userId: string, plan: SubscriptionPlan) {
    const sub = await this.db.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    if (sub) {
      await this.db.subscription.update({
        where: { id: sub.id },
        data: {
          plan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await this.db.subscription.create({
        data: {
          organizationId: orgId,
          plan,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    await this.events.emit({
      type: EventType.SUBSCRIPTION_UPDATED,
      actorId: userId as UserId,
      organizationId: orgId as OrganizationId,
      metadata: { plan },
    });

    this.logger.info({ orgId, plan }, 'Subscription upgraded (dev mode)');

    return {
      message: `Upgraded to ${plan} plan`,
      plan,
      limits: PLAN_LIMITS[plan],
    };
  }

  async cancelSubscription(orgId: string, userId: string) {
    const sub = await this.db.subscription.findFirst({
      where: { organizationId: orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) throw new NotFoundError('Active subscription');

    await this.db.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    await this.events.emit({
      type: EventType.SUBSCRIPTION_CANCELED,
      actorId: userId as UserId,
      organizationId: orgId as OrganizationId,
    });

    return { message: 'Subscription will be canceled at the end of the billing period' };
  }

  async getPlans() {
    return Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      name: plan,
      limits,
      price: this.getPlanPrice(plan as SubscriptionPlan),
    }));
  }

  private getPlanPrice(plan: SubscriptionPlan): { amount: number; currency: string; interval: string } | null {
    const prices: Record<string, { amount: number; currency: string; interval: string }> = {
      FREE: { amount: 0, currency: 'usd', interval: 'month' },
      STARTER: { amount: 2900, currency: 'usd', interval: 'month' },
      PRO: { amount: 9900, currency: 'usd', interval: 'month' },
      BUSINESS: { amount: 29900, currency: 'usd', interval: 'month' },
      ENTERPRISE: { amount: 0, currency: 'usd', interval: 'month' },
    };
    return prices[plan] || null;
  }
}
