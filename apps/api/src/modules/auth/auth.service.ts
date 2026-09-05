import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { createLogger } from '@umcp/logger';
import { getConfig } from '@umcp/config';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateUrlSafeToken,
  createHmacSignature,
} from '@umcp/crypto';
import {
  InvalidCredentialsError,
  DuplicateError,
  NotFoundError,
  AccountLockedError,
  MfaRequiredError,
  InvalidTokenError,
  TokenExpiredError,
  AUTH_CONSTANTS,
  type UserId,
} from '@umcp/shared';
import type { RegisterInput, LoginInput } from '@umcp/shared';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import { EventService } from '../event/event.service';
import { EventType } from '@umcp/shared';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    mfaEnabled: boolean;
  };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = createLogger('AuthService');

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly emailService: EmailService,
    private readonly events: EventService,
  ) {}

  // ─── OTP Passwordless Authentication ────────────────

  async sendOtp(email: string, name?: string): Promise<{ message: string }> {
    const cleanEmail = email.toLowerCase().trim();

    // Rate limit check: max 3 OTP requests per 10 minutes
    const rateKey = `otp_rate:${cleanEmail}`;
    const recentRequests = parseInt((await this.redis.get(rateKey)) || '0', 10);
    if (recentRequests >= 3) {
      throw new InvalidTokenError('Too many OTP requests. Please wait 10 minutes before trying again.');
    }
    await this.redis.set(rateKey, String(recentRequests + 1), 600);

    // Generate cryptographically random 6-digit OTP
    const crypto = await import('crypto');
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = createHmacSignature(otpCode, getConfig().JWT_SECRET);

    // Store in DB (expires in 10 mins)
    await this.db.emailOtp.create({
      data: {
        email: cleanEmail,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email via EmailService
    try {
      await this.emailService.sendOtpEmail(cleanEmail, otpCode, name);
    } catch (err) {
      throw new InvalidTokenError(err instanceof Error ? err.message : 'Failed to send OTP email via SMTP');
    }

    return { message: 'Verification code sent to your email' };
  }

  async verifyOtp(email: string, code: string, name?: string, ipAddress?: string): Promise<AuthResult> {
    const cleanEmail = email.toLowerCase().trim();
    const codeHash = createHmacSignature(code, getConfig().JWT_SECRET);

    const otpRecord = await this.db.emailOtp.findFirst({
      where: {
        email: cleanEmail,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new InvalidTokenError('Invalid or expired verification code');
    }

    if (otpRecord.attempts >= 5) {
      throw new InvalidTokenError('Too many failed attempts. Please request a new verification code.');
    }

    if (otpRecord.codeHash !== codeHash) {
      await this.db.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new InvalidTokenError('Incorrect verification code');
    }

    // Mark OTP as used
    await this.db.emailOtp.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Check if user already exists
    let user = await this.db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Auto-register new user in a transaction
      const userName = name || cleanEmail.split('@')[0];
      const config = getConfig();

      user = await this.db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: cleanEmail,
            name: userName,
            emailVerified: true,
            accounts: {
              create: {
                provider: 'EMAIL',
                providerAccountId: cleanEmail,
              },
            },
          },
        });

        const org = await tx.organization.create({
          data: {
            name: `${userName}'s Org`,
            slug: `${userName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`,
            ownerId: newUser.id,
            members: {
              create: { userId: newUser.id, role: 'OWNER' },
            },
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: 'Default Workspace',
            slug: 'default',
            organizationId: org.id,
            members: {
              create: { userId: newUser.id, role: 'ADMIN' },
            },
          },
        });

        await tx.workspace.update({
          where: { id: workspace.id },
          data: { mcpEndpoint: `${config.MCP_ENDPOINT_BASE}/u/${workspace.id}` },
        });

        await tx.subscription.create({
          data: {
            organizationId: org.id,
            plan: 'FREE',
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        return newUser;
      });

      await this.events.emit({
        type: EventType.USER_REGISTERED,
        actorId: user.id as UserId,
        metadata: { email: user.email },
        ipAddress: ipAddress || null,
      });
    } else {
      await this.db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), emailVerified: true },
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  // ─── Registration ───────────────────────────────────

  async register(input: RegisterInput, ipAddress?: string): Promise<AuthResult> {
    const existingUser = await this.db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new DuplicateError('User', 'email', input.email);
    }

    const passwordHash = await hashPassword(input.password, AUTH_CONSTANTS.BCRYPT_ROUNDS);

    const config = getConfig();

    const user = await this.db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
          accounts: {
            create: {
              provider: 'EMAIL',
              providerAccountId: input.email.toLowerCase(),
            },
          },
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${input.name || input.email.split('@')[0]}'s Org`,
          slug: `${(input.email.split('@')[0] || 'user').replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`,
          ownerId: newUser.id,
          members: {
            create: {
              userId: newUser.id,
              role: 'OWNER',
            },
          },
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: 'Default Workspace',
          slug: 'default',
          organizationId: org.id,
          members: {
            create: {
              userId: newUser.id,
              role: 'ADMIN',
            },
          },
        },
      });

      await tx.workspace.update({
        where: { id: workspace.id },
        data: { mcpEndpoint: `${config.MCP_ENDPOINT_BASE}/u/${workspace.id}` },
      });

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress);

    await this.events.emit({
      type: EventType.USER_REGISTERED,
      actorId: user.id as UserId,
      metadata: { email: user.email },
      ipAddress: ipAddress || null,
    });

    this.logger.info({ userId: user.id }, 'User registered');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  // ─── Login ──────────────────────────────────────────

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError();
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      const attempts = user.loginAttempts + 1;
      const update: Record<string, any> = { loginAttempts: attempts };

      if (attempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = new Date(
          Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
        this.logger.warn({ email: input.email, attempts }, 'Account locked due to too many failed attempts');
      }

      await this.db.user.update({
        where: { id: user.id },
        data: update,
      });

      throw new InvalidCredentialsError();
    }

    // Check MFA
    if (user.mfaEnabled) {
      const mfaToken = generateToken(32);
      await this.redis.set(`mfa:${mfaToken}`, user.id, 300); // 5 min
      throw new MfaRequiredError(mfaToken);
    }

    // Reset login attempts on success
    await this.db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress, userAgent);

    await this.events.emit({
      type: EventType.USER_LOGGED_IN,
      actorId: user.id as UserId,
      ipAddress: ipAddress || null,
    });

    this.logger.info({ userId: user.id }, 'User logged in');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  // ─── Magic Link ─────────────────────────────────────

  async requestMagicLink(email: string): Promise<{ message: string }> {
    const user = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists, a magic link has been sent' };
    }

    const token = generateUrlSafeToken(32);
    const config = getConfig();
    const tokenHash = createHmacSignature(token, config.MAGIC_LINK_SECRET);

    await this.db.magicLink.create({
      data: {
        email: email.toLowerCase(),
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const magicLinkUrl = `${config.APP_URL}/auth/magic-link?token=${token}`;
    this.logger.info({ email, magicLinkUrl }, 'Magic link generated (dev mode - logged to console)');

    return { message: 'If an account exists, a magic link has been sent' };
  }

  async verifyMagicLink(token: string, ipAddress?: string): Promise<AuthResult> {
    const config = getConfig();
    const tokenHash = createHmacSignature(token, config.MAGIC_LINK_SECRET);

    const magicLink = await this.db.magicLink.findUnique({
      where: { tokenHash },
    });

    if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
      throw new InvalidTokenError('Invalid or expired magic link');
    }

    await this.db.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    let user = await this.db.user.findUnique({
      where: { email: magicLink.email },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Mark email as verified
    if (!user.emailVerified) {
      user = await this.db.user.update({
        where: { id: user.id },
        data: { emailVerified: true, lastLoginAt: new Date() },
      });
    }

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: true,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  // ─── Token Refresh ──────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const session = await this.sessions.validate(refreshToken);
    if (!session) {
      throw new TokenExpiredError('Invalid or expired refresh token');
    }

    const user = await this.db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      throw new InvalidTokenError('User not found or inactive');
    }

    // Rotate refresh token
    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.rotate(session.id, tokens.refreshToken);

    return tokens;
  }

  // ─── Logout ─────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.sessions.revoke(refreshToken);

    await this.events.emit({
      type: EventType.USER_LOGGED_OUT,
      actorId: userId as UserId,
    });
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.sessions.revokeAll(userId);
  }

  // ─── Change Password ───────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User');
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword, AUTH_CONSTANTS.BCRYPT_ROUNDS);
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all other sessions
    await this.sessions.revokeAll(userId);

    await this.events.emit({
      type: EventType.PASSWORD_CHANGED,
      actorId: userId as UserId,
    });
  }

  // ─── OAuth Callback ────────────────────────────────

  async handleOAuthCallback(
    provider: string,
    profile: {
      id: string;
      email: string;
      name?: string;
      avatarUrl?: string;
      accessToken: string;
      refreshToken?: string;
    },
    ipAddress?: string,
  ): Promise<AuthResult> {
    let account = await this.db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: provider.toUpperCase(),
          providerAccountId: profile.id,
        },
      },
      include: { user: true },
    });

    let user;

    if (account) {
      user = account.user;

      // Update tokens
      await this.db.account.update({
        where: { id: account.id },
        data: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
        },
      });
    } else {
      // Check if user exists with this email
      user = await this.db.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (user) {
        // Link the account
        await this.db.account.create({
          data: {
            userId: user.id,
            provider: provider.toUpperCase(),
            providerAccountId: profile.id,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
          },
        });
      } else {
        // Create new user
        user = await this.db.user.create({
          data: {
            email: profile.email.toLowerCase(),
            name: profile.name || null,
            avatarUrl: profile.avatarUrl || null,
            emailVerified: true,
            accounts: {
              create: {
                provider: provider.toUpperCase(),
                providerAccountId: profile.id,
                accessToken: profile.accessToken,
                refreshToken: profile.refreshToken,
              },
            },
          },
        });

        // Create default org + workspace
        const org = await this.db.organization.create({
          data: {
            name: `${user.name || user.email.split('@')[0]}'s Org`,
            slug: `${(user.email.split('@')[0] || 'user').replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`,
            ownerId: user.id,
            members: {
              create: { userId: user.id, role: 'OWNER' },
            },
          },
        });

        const config = getConfig();
        const workspace = await this.db.workspace.create({
          data: {
            name: 'Default Workspace',
            slug: 'default',
            organizationId: org.id,
            members: {
              create: { userId: user.id, role: 'ADMIN' },
            },
          },
        });

        await this.db.workspace.update({
          where: { id: workspace.id },
          data: { mcpEndpoint: `${config.MCP_ENDPOINT_BASE}/u/${workspace.id}` },
        });

        await this.db.subscription.create({
          data: {
            organizationId: org.id,
            plan: 'FREE',
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        await this.events.emit({
          type: EventType.USER_REGISTERED,
          actorId: user.id as UserId,
          metadata: { provider, email: user.email },
          ipAddress: ipAddress || null,
        });
      }
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      tokens,
    };
  }

  // ─── User Profile ──────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: { provider: true, createdAt: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  // ─── GitHub OAuth Login & Account Linking ───────────

  async loginWithGithub(
    payload: {
      githubId: string;
      username: string;
      displayName: string | null;
      email: string;
      avatarUrl: string | null;
      profileUrl: string | null;
      accessToken: string;
      refreshToken?: string;
      scope?: string;
    },
    ipAddress?: string,
  ): Promise<AuthResult> {
    const cleanEmail = payload.email.toLowerCase().trim();
    const config = getConfig();

    // 1. Check if Account with GITHUB provider + providerAccountId already exists
    let account = await this.db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GITHUB',
          providerAccountId: payload.githubId,
        },
      },
      include: { user: true },
    });

    let user: any;

    if (account) {
      // Existing GitHub account -> update access token & last login
      user = account.user;

      await this.db.$transaction([
        this.db.account.update({
          where: { id: account.id },
          data: {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken || account.refreshToken,
            scope: payload.scope || account.scope,
            updatedAt: new Date(),
          },
        }),
        this.db.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            avatarUrl: user.avatarUrl || payload.avatarUrl,
            name: user.name || payload.displayName,
            emailVerified: true,
          },
        }),
      ]);
    } else {
      // 2. Account does not exist -> Check if User with same email exists
      const existingUser = await this.db.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        // LINK ACCOUNT: User registered via Email/OTP previously
        user = existingUser;

        await this.db.$transaction([
          this.db.account.create({
            data: {
              userId: user.id,
              provider: 'GITHUB',
              providerAccountId: payload.githubId,
              accessToken: payload.accessToken,
              refreshToken: payload.refreshToken,
              scope: payload.scope,
            },
          }),
          this.db.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              avatarUrl: user.avatarUrl || payload.avatarUrl,
              name: user.name || payload.displayName,
              emailVerified: true,
            },
          }),
        ]);
      } else {
        // 3. NEW USER: Create User + GITHUB Account + Org + Workspace + Subscription in a $transaction
        const userName = payload.displayName || payload.username || cleanEmail.split('@')[0];

        user = await this.db.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: cleanEmail,
              name: userName,
              avatarUrl: payload.avatarUrl,
              emailVerified: true,
              accounts: {
                create: {
                  provider: 'GITHUB',
                  providerAccountId: payload.githubId,
                  accessToken: payload.accessToken,
                  refreshToken: payload.refreshToken,
                  scope: payload.scope,
                },
              },
            },
          });

          const org = await tx.organization.create({
            data: {
              name: `${userName}'s Org`,
              slug: `${(userName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'user')}-${Date.now().toString(36)}`,
              ownerId: newUser.id,
              members: {
                create: { userId: newUser.id, role: 'OWNER' },
              },
            },
          });

          const workspace = await tx.workspace.create({
            data: {
              name: 'Default Workspace',
              slug: 'default',
              organizationId: org.id,
              members: {
                create: { userId: newUser.id, role: 'ADMIN' },
              },
            },
          });

          await tx.workspace.update({
            where: { id: workspace.id },
            data: { mcpEndpoint: `${config.MCP_ENDPOINT_BASE}/u/${workspace.id}` },
          });

          await tx.subscription.create({
            data: {
              organizationId: org.id,
              plan: 'FREE',
              status: 'ACTIVE',
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });

          return newUser;
        });

        await this.events.emit({
          type: EventType.USER_REGISTERED,
          actorId: user.id as UserId,
          metadata: { email: user.email, provider: 'GITHUB' },
          ipAddress: ipAddress || null,
        });
      }
    }

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.sessions.create(user.id, tokens.refreshToken, ipAddress);

    await this.events.emit({
      type: EventType.USER_LOGGED_IN,
      actorId: user.id as UserId,
      metadata: { email: user.email, provider: 'GITHUB' },
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
      tokens,
    };
  }

  // ─── Token Generation ─────────────────────────────

  private async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const config = getConfig();

    const accessToken = this.jwt.sign(
      {
        sub: userId,
        email,
        type: 'access',
      },
      { expiresIn: config.JWT_ACCESS_EXPIRY },
    );

    const refreshToken = generateUrlSafeToken(48);

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }
}
