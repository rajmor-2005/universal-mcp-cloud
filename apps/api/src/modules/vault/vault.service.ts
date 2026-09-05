import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { encryptWithContext, decryptWithContext } from '@umcp/crypto';
import { getConfig } from '@umcp/config';
import { NotFoundError, EncryptionError, EventType } from '@umcp/shared';
import type { UserId } from '@umcp/shared';
import { createLogger } from '@umcp/logger';
import { EventService } from '../event/event.service';

@Injectable()
export class VaultService {
  private readonly logger = createLogger('VaultService');

  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventService,
  ) {}

  /**
   * Store an encrypted secret for a connector instance.
   * The secret is bound to the connector instance ID via AAD for tamper protection.
   */
  async storeSecret(
    connectorInstanceId: string,
    key: string,
    plaintext: string,
    expiresAt?: Date,
    rotateAfter?: Date,
  ): Promise<void> {
    const config = getConfig();

    try {
      const encryptedValue = encryptWithContext(
        plaintext,
        config.ENCRYPTION_MASTER_KEY,
        connectorInstanceId,
      );

      // Get current version
      const existing = await this.db.secretEntry.findFirst({
        where: { connectorInstanceId, key },
        orderBy: { version: 'desc' },
      });

      const nextVersion = (existing?.version || 0) + 1;

      await this.db.secretEntry.create({
        data: {
          connectorInstanceId,
          key,
          encryptedValue,
          version: nextVersion,
          expiresAt: expiresAt || null,
          rotateAfter: rotateAfter || null,
        },
      });

      this.logger.info(
        { connectorInstanceId, key, version: nextVersion },
        'Secret stored',
      );
    } catch (error) {
      this.logger.error({ err: error, connectorInstanceId, key }, 'Failed to store secret');
      throw new EncryptionError('Failed to encrypt and store secret');
    }
  }

  /**
   * Retrieve and decrypt a secret.
   */
  async getSecret(connectorInstanceId: string, key: string): Promise<string> {
    const config = getConfig();

    const entry = await this.db.secretEntry.findFirst({
      where: { connectorInstanceId, key },
      orderBy: { version: 'desc' },
    });

    if (!entry) {
      throw new NotFoundError('Secret', `${connectorInstanceId}:${key}`);
    }

    // Check expiry
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      throw new NotFoundError('Secret (expired)', `${connectorInstanceId}:${key}`);
    }

    try {
      const plaintext = decryptWithContext(
        entry.encryptedValue,
        config.ENCRYPTION_MASTER_KEY,
        connectorInstanceId,
      );

      // Update last accessed
      await this.db.secretEntry.update({
        where: { id: entry.id },
        data: { lastAccessedAt: new Date() },
      });

      await this.events.emit({
        type: EventType.SECRET_ACCESSED,
        resourceType: 'SecretEntry',
        resourceId: entry.id,
        metadata: { connectorInstanceId, key },
      });

      return plaintext;
    } catch (error) {
      this.logger.error(
        { err: error, connectorInstanceId, key },
        'Failed to decrypt secret',
      );
      throw new EncryptionError('Failed to decrypt secret');
    }
  }

  /**
   * Get all secrets for a connector instance (keys only, no plaintext).
   */
  async listSecrets(connectorInstanceId: string) {
    const entries = await this.db.secretEntry.findMany({
      where: { connectorInstanceId },
      select: {
        id: true,
        key: true,
        version: true,
        expiresAt: true,
        rotateAfter: true,
        lastAccessedAt: true,
        createdAt: true,
      },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      distinct: ['key'],
    });

    return entries;
  }

  /**
   * Rotate a secret by storing a new version.
   */
  async rotateSecret(
    connectorInstanceId: string,
    key: string,
    newPlaintext: string,
    userId?: string,
  ): Promise<void> {
    await this.storeSecret(connectorInstanceId, key, newPlaintext);

    await this.events.emit({
      type: EventType.SECRET_ROTATED,
      actorId: userId as UserId,
      resourceType: 'SecretEntry',
      metadata: { connectorInstanceId, key },
    });

    this.logger.info({ connectorInstanceId, key }, 'Secret rotated');
  }

  /**
   * Delete all secrets for a connector instance.
   */
  async deleteAllSecrets(connectorInstanceId: string): Promise<void> {
    await this.db.secretEntry.deleteMany({
      where: { connectorInstanceId },
    });

    this.logger.info({ connectorInstanceId }, 'All secrets deleted');
  }

  /**
   * Find secrets that need rotation.
   */
  async getSecretsNeedingRotation(): Promise<
    Array<{ id: string; connectorInstanceId: string; key: string }>
  > {
    const now = new Date();
    return this.db.secretEntry.findMany({
      where: {
        rotateAfter: { lte: now },
      },
      select: {
        id: true,
        connectorInstanceId: true,
        key: true,
      },
    });
  }

  /**
   * Find secrets that are about to expire (within the next hour).
   */
  async getExpiringSecrets(): Promise<
    Array<{ id: string; connectorInstanceId: string; key: string; expiresAt: Date }>
  > {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    return this.db.secretEntry.findMany({
      where: {
        expiresAt: {
          gte: new Date(),
          lte: oneHourFromNow,
        },
      },
      select: {
        id: true,
        connectorInstanceId: true,
        key: true,
        expiresAt: true,
      },
    }) as any;
  }
}
