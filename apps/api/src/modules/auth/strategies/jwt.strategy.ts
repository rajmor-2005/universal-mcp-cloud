import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getConfig } from '@umcp/config';
import { DatabaseService } from '../../../common/database/database.service';
import { AuthenticationError } from '@umcp/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getConfig().JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email: string; type: string }) {
    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        mfaEnabled: true,
        emailVerified: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    return user;
  }
}
