import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  mfaVerifySchema,
  mfaSetupSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '@umcp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { GithubProfilePayload } from './strategies/github.strategy';
import { getConfig } from '@umcp/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mfa: MfaService,
  ) {}

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth authentication flow' })
  async githubAuth() {
    // Handled by GithubAuthGuard passport redirect
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback endpoint' })
  async githubAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const githubPayload = req.user as GithubProfilePayload;
    const authResult = await this.auth.loginWithGithub(githubPayload, req.ip);

    const config = getConfig();
    let redirectBase = config.APP_URL;
    const stateParam = req.query?.state as string;
    if (stateParam && (stateParam.startsWith('http://') || stateParam.startsWith('https://'))) {
      try {
        const url = new URL(stateParam);
        if (url.hostname === 'localhost' || url.hostname.endsWith('vercel.app')) {
          redirectBase = url.origin;
        }
      } catch {}
    }

    const targetUrl = new URL('/callback', redirectBase);
    targetUrl.searchParams.set('accessToken', authResult.tokens.accessToken);
    targetUrl.searchParams.set('refreshToken', authResult.tokens.refreshToken);

    return res.redirect(targetUrl.toString());
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 600000, limit: 5 } })
  @ApiOperation({ summary: 'Send a 6-digit OTP verification code via email' })
  async sendOtp(
    @Body(new ZodValidationPipe(sendOtpSchema)) body: any,
  ) {
    return this.auth.sendOtp(body.email, body.name);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 900000, limit: 10 } })
  @ApiOperation({ summary: 'Verify OTP code for passwordless login or registration' })
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: any,
    @Req() req: Request,
  ) {
    return this.auth.verifyOtp(body.email, body.code, body.name, req.ip);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: any,
    @Req() req: Request,
  ) {
    return this.auth.register(body, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 900000, limit: 10 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: any,
    @Req() req: Request,
  ) {
    return this.auth.login(body, req.ip, req.headers['user-agent']);
  }

  @Post('magic-link/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 900000, limit: 5 } })
  @ApiOperation({ summary: 'Request a magic link for passwordless login' })
  async requestMagicLink(
    @Body(new ZodValidationPipe(magicLinkRequestSchema)) body: any,
  ) {
    return this.auth.requestMagicLink(body.email);
  }

  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a magic link token' })
  async verifyMagicLink(
    @Body(new ZodValidationPipe(magicLinkVerifySchema)) body: any,
    @Req() req: Request,
  ) {
    return this.auth.verifyMagicLink(body.token, req.ip);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code during login' })
  async verifyMfa(
    @Body(new ZodValidationPipe(mfaVerifySchema)) body: any,
    @Req() req: Request,
  ) {
    return this.mfa.verifyLoginMfa(body.mfaToken, body.code, req.ip);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set up MFA for the current user' })
  async setupMfa(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(mfaSetupSchema)) body: any,
  ) {
    return this.mfa.setupTotp(userId);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA after verifying setup code' })
  async enableMfa(
    @CurrentUser('id') userId: string,
    @Body() body: { code: string },
  ) {
    return this.mfa.enableTotp(userId, body.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(
    @CurrentUser('id') userId: string,
    @Body() body: { code: string },
  ) {
    return this.mfa.disableTotp(userId, body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: any,
  ) {
    return this.auth.refreshTokens(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body: { refreshToken: string },
  ) {
    await this.auth.logout(userId, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.auth.logoutAllSessions(userId);
    return { message: 'All sessions logged out' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: any,
  ) {
    await this.auth.changePassword(userId, body.currentPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.auth.getProfile(userId);
  }
}
