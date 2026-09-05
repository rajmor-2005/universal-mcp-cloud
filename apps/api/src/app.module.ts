/**
 * Root application module — imports all feature modules.
 */

import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { getConfig } from '@umcp/config';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ConnectorModule } from './modules/connector/connector.module';
import { McpModule } from './modules/mcp/mcp.module';
import { VaultModule } from './modules/vault/vault.module';
import { EventModule } from './modules/event/event.module';
import { BillingModule } from './modules/billing/billing.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ─── Infrastructure ─────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: new URL(getConfig().REDIS_URL).hostname,
        port: parseInt(new URL(getConfig().REDIS_URL).port || '6379', 10),
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),

    // ─── Core ───────────────────────────────────────
    DatabaseModule,
    RedisModule,
    EventModule,

    // ─── Feature Modules ────────────────────────────
    AuthModule,
    OrganizationModule,
    WorkspaceModule,
    ConnectorModule,
    VaultModule,
    McpModule,
    BillingModule,
    WebhookModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
