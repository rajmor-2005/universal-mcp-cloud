declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../../../common/database/database.service';
import { RedisService } from '../../../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../session.service';
import { EmailService } from '../email.service';
import { EventService } from '../../event/event.service';

describe('GitHub Authentication Flow', () => {
  let authService: AuthService;
  let db: jest.Mocked<DatabaseService>;

  const mockDb = {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
    },
    "$transaction": jest.fn((arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockDb);
      }
      return Promise.all(arg);
    }),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked_access_token'),
  };

  const mockSessionService = {
    create: jest.fn().mockResolvedValue({ id: 'session_123' }),
  };

  const mockEmailService = {};

  const mockEventService = {
    emit: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: EventService, useValue: mockEventService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    db = module.get(DatabaseService);
  });

  describe('loginWithGithub', () => {
    const mockGithubPayload = {
      githubId: '98765432',
      username: 'octocat',
      displayName: 'Monalisa Octocat',
      email: 'octocat@github.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/98765432',
      profileUrl: 'https://github.com/octocat',
      accessToken: 'gho_mock_access_token_123',
      scope: 'user:email read:user',
    };

    it('should log in existing GitHub account user and update tokens', async () => {
      const existingUser = {
        id: 'user_uuid_1',
        email: 'octocat@github.com',
        name: 'Monalisa Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/98765432',
        emailVerified: true,
        mfaEnabled: false,
      };

      mockDb.account.findUnique.mockResolvedValueOnce({
        id: 'account_uuid_1',
        userId: existingUser.id,
        provider: 'GITHUB',
        providerAccountId: '98765432',
        user: existingUser,
      } as any);

      const result = await authService.loginWithGithub(mockGithubPayload, '127.0.0.1');

      expect(mockDb.account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: 'GITHUB',
            providerAccountId: '98765432',
          },
        },
        include: { user: true },
      });

      expect(result.user.email).toBe('octocat@github.com');
      expect(result.tokens.accessToken).toBe('mocked_access_token');
      expect(mockSessionService.create).toHaveBeenCalledWith(existingUser.id, expect.any(String), '127.0.0.1');
    });

    it('should link GitHub account to existing user with same email (Account Linking)', async () => {
      mockDb.account.findUnique.mockResolvedValueOnce(null); // No GitHub account yet

      const existingEmailUser = {
        id: 'user_uuid_2',
        email: 'octocat@github.com',
        name: 'Original Name',
        avatarUrl: null,
        emailVerified: false,
        mfaEnabled: false,
      };

      mockDb.user.findUnique.mockResolvedValueOnce(existingEmailUser as any);

      const result = await authService.loginWithGithub(mockGithubPayload);

      expect(mockDb.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_uuid_2',
          provider: 'GITHUB',
          providerAccountId: '98765432',
          accessToken: 'gho_mock_access_token_123',
        }),
      });

      expect(result.user.id).toBe('user_uuid_2');
      expect(result.tokens).toBeDefined();
    });

    it('should create new User, Organization, Workspace, and Subscription if user does not exist', async () => {
      mockDb.account.findUnique.mockResolvedValueOnce(null);
      mockDb.user.findUnique.mockResolvedValueOnce(null);

      const createdUser = {
        id: 'new_user_uuid',
        email: 'octocat@github.com',
        name: 'Monalisa Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/98765432',
        emailVerified: true,
        mfaEnabled: false,
      };

      mockDb.user.create.mockResolvedValueOnce(createdUser as any);
      mockDb.organization.create.mockResolvedValueOnce({ id: 'org_123' } as any);
      mockDb.workspace.create.mockResolvedValueOnce({ id: 'ws_123' } as any);
      mockDb.workspace.update.mockResolvedValueOnce({ id: 'ws_123' } as any);
      mockDb.subscription.create.mockResolvedValueOnce({ id: 'sub_123' } as any);

      const result = await authService.loginWithGithub(mockGithubPayload, '1.2.3.4');

      expect(mockDb.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'octocat@github.com',
          name: 'Monalisa Octocat',
          avatarUrl: 'https://avatars.githubusercontent.com/u/98765432',
          emailVerified: true,
          accounts: {
            create: expect.objectContaining({
              provider: 'GITHUB',
              providerAccountId: '98765432',
            }),
          },
        }),
      });

      expect(mockDb.organization.create).toHaveBeenCalled();
      expect(mockDb.workspace.create).toHaveBeenCalled();
      expect(mockDb.subscription.create).toHaveBeenCalled();

      expect(result.user.id).toBe('new_user_uuid');
      expect(result.tokens.accessToken).toBe('mocked_access_token');
    });
  });
});
