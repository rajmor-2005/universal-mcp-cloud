import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { DatabaseService } from '../../../common/database/database.service';
import { createHmacSignature } from '@umcp/crypto';
import { getConfig } from '@umcp/config';
import { AuthenticationError, AUTH_CONSTANTS } from '@umcp/shared';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: (req: Request) => {
        const apiKey = req.headers['x-api-key'] as string;
        if (!apiKey) return null;
        return apiKey;
      },
      secretOrKey: 'api-key-placeholder',
      // We override validate to do our own logic
    });
  }

  async validate(apiKeyValue: string) {
    if (!apiKeyValue || !apiKeyValue.startsWith(AUTH_CONSTANTS.API_KEY_PREFIX)) {
      throw new AuthenticationError('Invalid API key format');
    }

    const keyHash = createHmacSignature(apiKeyValue, getConfig().JWT_SECRET);

    const apiKey = await this.db.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: { id: true, email: true, name: true, isActive: true },
        },
        workspace: {
          select: { id: true, organizationId: true, isActive: true },
        },
      },
    });

    if (!apiKey || !apiKey.isActive) {
      throw new AuthenticationError('Invalid or revoked API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new AuthenticationError('API key has expired');
    }

    if (!apiKey.user.isActive || !apiKey.workspace.isActive) {
      throw new AuthenticationError('Associated user or workspace is inactive');
    }

    // Update last used
    await this.db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      ...apiKey.user,
      workspaceId: apiKey.workspace.id,
      organizationId: apiKey.workspace.organizationId,
      scopes: apiKey.scopes,
      apiKeyId: apiKey.id,
    };
  }
}
