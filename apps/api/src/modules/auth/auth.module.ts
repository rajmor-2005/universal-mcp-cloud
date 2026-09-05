import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getConfig } from '@umcp/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { MfaService } from './mfa.service';
import { PasskeyService } from './passkey.service';
import { SessionService } from './session.service';

import { EmailService } from './email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getConfig().JWT_SECRET,
      signOptions: { expiresIn: getConfig().JWT_ACCESS_EXPIRY },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    MfaService,
    PasskeyService,
    SessionService,
    JwtStrategy,
    ApiKeyStrategy,
    GithubStrategy,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyGuard,
    GithubAuthGuard,
  ],
  exports: [AuthService, EmailService, JwtAuthGuard, RolesGuard, ApiKeyGuard, GithubAuthGuard, SessionService],
})
export class AuthModule {}
