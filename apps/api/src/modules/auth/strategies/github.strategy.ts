import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { getConfig } from '@umcp/config';
import { AuthService } from '../auth.service';

export interface GithubProfilePayload {
  githubId: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly authService: AuthService) {
    const config = getConfig();
    super({
      clientID: config.GITHUB_CLIENT_ID || 'unconfigured_github_client_id',
      clientSecret: config.GITHUB_CLIENT_SECRET || 'unconfigured_github_client_secret',
      callbackURL: config.GITHUB_CALLBACK_URL,
      scope: ['user:email', 'read:user'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any, info?: any) => void,
  ): Promise<any> {
    try {
      let primaryEmail = profile.emails?.find((e: any) => e.primary || e.verified)?.value || profile.emails?.[0]?.value;

      // If public profile email is missing/private, fetch from GitHub user emails endpoint
      if (!primaryEmail && accessToken) {
        const response = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'UniversalMCPCloud-Auth',
            Accept: 'application/vnd.github+json',
          },
        });

        if (response.ok) {
          const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await response.json();
          const primaryObj = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
          if (primaryObj) {
            primaryEmail = primaryObj.email;
          }
        }
      }

      if (!primaryEmail) {
        return done(new Error('Unable to retrieve a verified email address from GitHub account'), false);
      }

      const payload: GithubProfilePayload = {
        githubId: String(profile.id),
        username: profile.username || profile.displayName || primaryEmail.split('@')[0],
        displayName: profile.displayName || profile.username || null,
        email: primaryEmail.toLowerCase().trim(),
        avatarUrl: profile.photos?.[0]?.value || null,
        profileUrl: profile.profileUrl || `https://github.com/${profile.username}`,
        accessToken,
        refreshToken: refreshToken || undefined,
        scope: 'user:email read:user',
      };

      return done(null, payload);
    } catch (err) {
      return done(err, false);
    }
  }
}
