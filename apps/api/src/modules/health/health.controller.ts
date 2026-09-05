import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('health')
@Controller({ path: 'health', version: [VERSION_NEUTRAL, '1'] })
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};

    // Database
    try {
      const start = Date.now();
      await this.db.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      checks.database = { status: 'unhealthy' };
    }

    // Redis
    try {
      const start = Date.now();
      await this.redis.client.ping();
      checks.redis = { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      checks.redis = { status: 'unhealthy' };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      await this.redis.client.ping();
      return { status: 'ready' };
    } catch {
      return { status: 'not ready' };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  async live() {
    return { status: 'alive', uptime: process.uptime() };
  }
}
