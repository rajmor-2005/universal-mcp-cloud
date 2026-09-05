import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getConfig } from '@umcp/config';
import { createLogger } from '@umcp/logger';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('RedisService');
  public client: Redis;
  public subscriber: Redis;
  public publisher: Redis;

  private isConnected = false;
  private memoryStore = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    const config = getConfig();
    const redisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => (times > 3 ? null : 1000),
    };

    this.client = new Redis(config.REDIS_URL, redisOptions);
    this.subscriber = new Redis(config.REDIS_URL, redisOptions);
    this.publisher = new Redis(config.REDIS_URL, redisOptions);

    // Register error handlers so uncaught ioredis errors don't crash process
    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.debug({ msg: err.message }, 'Redis client connection status note');
    });
    this.subscriber.on('error', (err) => {
      this.isConnected = false;
    });
    this.publisher.on('error', (err) => {
      this.isConnected = false;
    });
    this.client.on('connect', () => {
      this.isConnected = true;
    });
  }

  async onModuleInit() {
    try {
      await Promise.all([
        this.client.connect().catch(() => {}),
        this.subscriber.connect().catch(() => {}),
        this.publisher.connect().catch(() => {}),
      ]);
      if (this.client.status === 'ready') {
        this.isConnected = true;
        this.logger.info('Redis connections established');
      } else {
        this.logger.warn('Redis server unavailable, operating with in-memory fallback cache');
      }
    } catch {
      this.logger.warn('Redis server unavailable, operating with in-memory fallback cache');
    }
  }

  async onModuleDestroy() {
    try {
      await Promise.all([
        this.client.quit().catch(() => {}),
        this.subscriber.quit().catch(() => {}),
        this.publisher.quit().catch(() => {}),
      ]);
    } catch {
      // Ignore cleanup errors
    }
  }

  // ─── Key-Value Operations ───────────────────────────

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.get(key);
      } catch {
        // Fall back to memory
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, value);
        } else {
          await this.client.set(key, value);
        }
      } catch {
        // Fall back to memory
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        await this.client.del(key);
      } catch {
        // Fall back to memory
      }
    }
    this.memoryStore.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async ttl(key: string): Promise<number> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.ttl(key);
      } catch {
        // Fall back
      }
    }
    const item = this.memoryStore.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        const res = await this.client.expire(key, seconds);
        return res === 1;
      } catch {
        // Fall back
      }
    }
    const item = this.memoryStore.get(key);
    if (!item) return false;
    item.expiresAt = Date.now() + seconds * 1000;
    return true;
  }

  // ─── Counter Operations ─────────────────────────────

  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.incr(key);
      } catch {
        // Fall back to memory
      }
    }

    const current = parseInt((await this.get(key)) || '0', 10) + 1;
    await this.set(key, String(current));
    return current;
  }

  async incrBy(key: string, amount: number): Promise<number> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.incrby(key, amount);
      } catch {
        // Fall back to memory
      }
    }

    const current = parseInt((await this.get(key)) || '0', 10) + amount;
    await this.set(key, String(current));
    return current;
  }

  // ─── Sliding Window Rate Limiter ────────────────────

  async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        const now = Date.now();
        const windowStart = now - windowMs;

        const multi = this.client.multi();
        multi.zremrangebyscore(key, 0, windowStart);
        multi.zadd(key, now, `${now}:${Math.random()}`);
        multi.zcard(key);
        multi.pexpire(key, windowMs);

        const results = await multi.exec();
        const count = (results?.[2]?.[1] as number) || 0;

        return {
          allowed: count <= maxRequests,
          remaining: Math.max(0, maxRequests - count),
          resetMs: windowMs,
        };
      } catch {
        // Return allowed if rate limiter fails
      }
    }

    return {
      allowed: true,
      remaining: maxRequests,
      resetMs: windowMs,
    };
  }

  // ─── Pub/Sub ────────────────────────────────────────

  async publish(channel: string, message: string): Promise<void> {
    if (this.isConnected && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(channel, message);
      } catch {
        // Ignore
      }
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (this.isConnected && this.subscriber.status === 'ready') {
      try {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, msg) => {
          if (ch === channel) {
            handler(msg);
          }
        });
      } catch {
        // Ignore
      }
    }
  }

  // ─── Hash Operations ───────────────────────────────

  async hset(key: string, field: string, value: string): Promise<void> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        await this.client.hset(key, field, value);
        return;
      } catch {
        // Fall back
      }
    }
    const dict = (await this.getJson<Record<string, string>>(key)) || {};
    dict[field] = value;
    await this.setJson(key, dict);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.hget(key, field);
      } catch {
        // Fall back
      }
    }
    const dict = (await this.getJson<Record<string, string>>(key)) || {};
    return dict[field] || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        return await this.client.hgetall(key);
      } catch {
        // Fall back
      }
    }
    return (await this.getJson<Record<string, string>>(key)) || {};
  }

  async hdel(key: string, field: string): Promise<void> {
    if (this.isConnected && this.client.status === 'ready') {
      try {
        await this.client.hdel(key, field);
        return;
      } catch {
        // Fall back
      }
    }
    const dict = (await this.getJson<Record<string, string>>(key)) || {};
    delete dict[field];
    await this.setJson(key, dict);
  }

  // ─── JSON helpers ──────────────────────────────────

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}
