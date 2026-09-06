import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@umcp/database';
import { createLogger } from '@umcp/logger';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('DatabaseService');

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.info('Database connection established');
    } catch (err: any) {
      this.logger.warn({ msg: err.message }, 'Database connection failed during startup (will retry on query)');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.info('Database connection closed');
  }
}
