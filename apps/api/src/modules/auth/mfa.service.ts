import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { encrypt, decrypt, generateToken } from '@umcp/crypto';
import { getConfig } from '@umcp/config';
import {
  MfaInvalidError,
  NotFoundError,
  InvalidTokenError,
  AUTH_CONSTANTS,
  EventType,
  type UserId,
} from '@umcp/shared';
import { createLogger } from '@umcp/logger';
import { SessionService } from './session.service';
import { EventService } from '../event/event.service';

@Injectable()
export class MfaService {
  private readonly logger = createLogger('MfaService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly events: EventService,
  ) {}

  async setupTotp(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundError('User', userId);

    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: AUTH_CONSTANTS.TOTP_ISSUER,
      label: user.email,
      algorithm: AUTH_CONSTANTS.TOTP_ALGORITHM,
      digits: AUTH_CONSTANTS.TOTP_DIGITS,
      period: AUTH_CONSTANTS.TOTP_PERIOD,
      secret,
    });

    const config = getConfig();
    const encryptedSecret = encrypt(secret.base32, config.ENCRYPTION_MASTER_KEY);

    // Store temporarily until verified
    await this.redis.set(
      `mfa_setup:${userId}`,
      encryptedSecret,
      600, // 10 minutes to complete setup
    );

    const uri = totp.toString();
    const qrCode = await QRCode.toDataURL(uri);

    return {
      secret: secret.base32,
      uri,
      qrCode,
    };
  }

  async enableTotp(userId: string, code: string) {
    const config = getConfig();
    const encryptedSecret = await this.redis.get(`mfa_setup:${userId}`);

    if (!encryptedSecret) {
      throw new InvalidTokenError('MFA setup expired. Please start again.');
    }

    const secretBase32 = decrypt(encryptedSecret, config.ENCRYPTION_MASTER_KEY);

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secretBase32),
      algorithm: AUTH_CONSTANTS.TOTP_ALGORITHM,
      digits: AUTH_CONSTANTS.TOTP_DIGITS,
      period: AUTH_CONSTANTS.TOTP_PERIOD,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new MfaInvalidError();
    }

    // Store the credential permanently
    await this.db.mfaCredential.upsert({
      where: { userId_method: { userId, method: 'TOTP' } },
      update: { secret: encryptedSecret, isActive: true },
      create: { userId, method: 'TOTP', secret: encryptedSecret },
    });

    await this.db.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    await this.redis.del(`mfa_setup:${userId}`);

    await this.events.emit({
      type: EventType.MFA_ENABLED,
      actorId: userId as UserId,
    });

    this.logger.info({ userId }, 'MFA enabled');
    return { message: 'MFA enabled successfully' };
  }

  async disableTotp(userId: string, code: string) {
    const credential = await this.db.mfaCredential.findUnique({
      where: { userId_method: { userId, method: 'TOTP' } },
    });

    if (!credential) {
      throw new NotFoundError('MFA credential');
    }

    const config = getConfig();
    const secretBase32 = decrypt(credential.secret, config.ENCRYPTION_MASTER_KEY);

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secretBase32),
      algorithm: AUTH_CONSTANTS.TOTP_ALGORITHM,
      digits: AUTH_CONSTANTS.TOTP_DIGITS,
      period: AUTH_CONSTANTS.TOTP_PERIOD,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new MfaInvalidError();
    }

    await this.db.mfaCredential.delete({
      where: { userId_method: { userId, method: 'TOTP' } },
    });

    await this.db.user.update({
      where: { id: userId },
      data: { mfaEnabled: false },
    });

    await this.events.emit({
      type: EventType.MFA_DISABLED,
      actorId: userId as UserId,
    });

    this.logger.info({ userId }, 'MFA disabled');
    return { message: 'MFA disabled successfully' };
  }

  async verifyLoginMfa(
    mfaToken: string,
    code: string,
    ipAddress?: string,
  ) {
    const userId = await this.redis.get(`mfa:${mfaToken}`);
    if (!userId) {
      throw new InvalidTokenError('MFA token expired');
    }

    const credential = await this.db.mfaCredential.findUnique({
      where: { userId_method: { userId, method: 'TOTP' } },
    });

    if (!credential) {
      throw new NotFoundError('MFA credential');
    }

    const config = getConfig();
    const secretBase32 = decrypt(credential.secret, config.ENCRYPTION_MASTER_KEY);

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secretBase32),
      algorithm: AUTH_CONSTANTS.TOTP_ALGORITHM,
      digits: AUTH_CONSTANTS.TOTP_DIGITS,
      period: AUTH_CONSTANTS.TOTP_PERIOD,
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new MfaInvalidError();
    }

    // Clean up the MFA token
    await this.redis.del(`mfa:${mfaToken}`);

    // Update user login state
    const user = await this.db.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, type: 'access' },
      { expiresIn: config.JWT_ACCESS_EXPIRY },
    );

    const refreshToken = generateToken(48);
    await this.sessions.create(user.id, refreshToken, ipAddress);

    await this.events.emit({
      type: EventType.USER_LOGGED_IN,
      actorId: user.id as UserId,
      metadata: { mfa: true },
      ipAddress: ipAddress || null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY_SECONDS,
      },
    };
  }
}
