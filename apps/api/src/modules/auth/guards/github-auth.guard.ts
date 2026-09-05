import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { getConfig } from '@umcp/config';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = getConfig();

    if (
      !config.GITHUB_CLIENT_ID ||
      !config.GITHUB_CLIENT_SECRET ||
      config.GITHUB_CLIENT_ID === 'unconfigured_github_client_id'
    ) {
      const res = context.switchToHttp().getResponse();
      const errorMsg = 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.';
      res.redirect(`${config.APP_URL}/login?error=${encodeURIComponent(errorMsg)}`);
      return false;
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const origin = (req.query?.origin as string) || undefined;
    return {
      session: false,
      state: origin,
    };
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
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

    if (err || !user) {
      const errorMessage = err?.message || info?.message || 'GitHub authentication failed or was cancelled';
      const redirectUrl = `${redirectBase}/login?error=${encodeURIComponent(errorMessage)}`;
      res.redirect(redirectUrl);
      return null;
    }

    return user;
  }
}
