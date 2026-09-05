import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { InsufficientRoleError } from '@umcp/shared';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.params.workspaceId || request.headers['x-workspace-id'];

    if (!user || !workspaceId) {
      throw new InsufficientRoleError(requiredRoles[0] || 'MEMBER');
    }

    const membership = await this.db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new InsufficientRoleError(requiredRoles[0] || 'MEMBER');
    }

    const roleHierarchy: Record<string, number> = {
      VIEWER: 0,
      MEMBER: 1,
      ADMIN: 2,
      OWNER: 3,
    };

    const userLevel = roleHierarchy[membership.role] ?? -1;
    const requiredLevel = Math.min(
      ...requiredRoles.map((r) => roleHierarchy[r] ?? Infinity),
    );

    if (userLevel < requiredLevel) {
      throw new InsufficientRoleError(requiredRoles[0] || 'MEMBER');
    }

    // Attach workspace membership to request for downstream use
    request.workspaceMembership = membership;
    return true;
  }
}
