import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { createHmacSignature, generateUrlSafeToken } from '@umcp/crypto';
import { getConfig } from '@umcp/config';
import { AUTH_CONSTANTS } from '@umcp/shared';

@Injectable()
export class SessionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async create(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const tokenHash = createHmacSignature(refreshToken, getConfig().JWT_SECRET);

    const session = await this.db.session.create({
      data: {
        userId,
        tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        ),
      },
    });

    // Cache session in Redis for fast lookup
    await this.redis.set(
      `session:${tokenHash}`,
      JSON.stringify({ id: session.id, userId }),
      AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS,
    );

    return session.id;
  }

  async validate(refreshToken: string): Promise<{ id: string; userId: string } | null> {
    const tokenHash = createHmacSignature(refreshToken, getConfig().JWT_SECRET);

    // Check Redis first
    const cached = await this.redis.getJson<{ id: string; userId: string }>(
      `session:${tokenHash}`,
    );
    if (cached) return cached;

    // Fallback to DB
    const session = await this.db.session.findUnique({
      where: { tokenHash },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    // Re-cache
    const data = { id: session.id, userId: session.userId };
    await this.redis.setJson(`session:${tokenHash}`, data, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS);

    return data;
  }

  async rotate(sessionId: string, newRefreshToken: string): Promise<void> {
    const oldSession = await this.db.session.findUnique({
      where: { id: sessionId },
    });

    if (oldSession) {
      await this.redis.del(`session:${oldSession.tokenHash}`);
    }

    const newTokenHash = createHmacSignature(newRefreshToken, getConfig().JWT_SECRET);

    await this.db.session.update({
      where: { id: sessionId },
      data: {
        tokenHash: newTokenHash,
        lastActiveAt: new Date(),
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
        ),
      },
    });

    await this.redis.set(
      `session:${newTokenHash}`,
      JSON.stringify({ id: sessionId, userId: oldSession?.userId }),
      AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY_SECONDS,
    );
  }

  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = createHmacSignature(refreshToken, getConfig().JWT_SECRET);
    await this.redis.del(`session:${tokenHash}`);
    await this.db.session.deleteMany({ where: { tokenHash } });
  }

  async revokeAll(userId: string): Promise<void> {
    const sessions = await this.db.session.findMany({
      where: { userId },
      select: { tokenHash: true },
    });

    for (const session of sessions) {
      await this.redis.del(`session:${session.tokenHash}`);
    }

    await this.db.session.deleteMany({ where: { userId } });
  }
}
