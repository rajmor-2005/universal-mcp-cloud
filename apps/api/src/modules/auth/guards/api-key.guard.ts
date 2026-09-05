import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
