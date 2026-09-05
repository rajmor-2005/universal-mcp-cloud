import { Injectable } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { getConfig } from '@umcp/config';
import { NotFoundError, AuthenticationError, AUTH_CONSTANTS } from '@umcp/shared';
import { createLogger } from '@umcp/logger';

@Injectable()
export class PasskeyService {
  private readonly logger = createLogger('PasskeyService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async generateRegistrationOptions(userId: string) {
    const config = getConfig();
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });

    if (!user) throw new NotFoundError('User', userId);

    const options = await generateRegistrationOptions({
      rpName: config.WEBAUTHN_RP_NAME,
      rpID: config.WEBAUTHN_RP_ID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialId,
        transports: pk.transports as any[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: AUTH_CONSTANTS.PASSKEY_CHALLENGE_TIMEOUT_MS,
    });

    await this.redis.setJson(
      `passkey_challenge:${userId}`,
      options,
      120, // 2 minutes
    );

    return options;
  }

  async verifyRegistration(userId: string, credential: any) {
    const config = getConfig();
    const challengeData = await this.redis.getJson<any>(`passkey_challenge:${userId}`);

    if (!challengeData) {
      throw new AuthenticationError('Passkey challenge expired');
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: config.WEBAUTHN_ORIGIN,
      expectedRPID: config.WEBAUTHN_RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AuthenticationError('Passkey verification failed');
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await this.db.passkey.create({
      data: {
        userId,
        credentialId: cred.id,
        publicKey: Buffer.from(cred.publicKey),
        counter: BigInt(cred.counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: (credential.response as any).transports || [],
      },
    });

    await this.redis.del(`passkey_challenge:${userId}`);
    this.logger.info({ userId }, 'Passkey registered');

    return { verified: true };
  }

  async generateAuthenticationOptions(email?: string) {
    const config = getConfig();
    let allowCredentials: Array<{ id: string; transports: any[] }> = [];

    if (email) {
      const user = await this.db.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { passkeys: true },
      });

      if (user) {
        allowCredentials = user.passkeys.map((pk) => ({
          id: pk.credentialId,
          transports: pk.transports as any[],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: config.WEBAUTHN_RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
      timeout: AUTH_CONSTANTS.PASSKEY_CHALLENGE_TIMEOUT_MS,
    });

    const challengeKey = `passkey_auth_challenge:${options.challenge}`;
    await this.redis.set(challengeKey, 'pending', 120);

    return options;
  }

  async verifyAuthentication(credential: any) {
    const config = getConfig();

    const passkey = await this.db.passkey.findUnique({
      where: { credentialId: credential.id },
      include: { user: true },
    });

    if (!passkey) {
      throw new AuthenticationError('Passkey not found');
    }

    const challengeKey = `passkey_auth_challenge:${(credential as any).challenge}`;

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: async (challenge) => {
        const key = `passkey_auth_challenge:${challenge}`;
        const exists = await this.redis.exists(key);
        if (exists) {
          await this.redis.del(key);
          return true;
        }
        return false;
      },
      expectedOrigin: config.WEBAUTHN_ORIGIN,
      expectedRPID: config.WEBAUTHN_RP_ID,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports as any[],
      },
    });

    if (!verification.verified) {
      throw new AuthenticationError('Passkey authentication failed');
    }

    // Update counter
    await this.db.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    return passkey.user;
  }
}
