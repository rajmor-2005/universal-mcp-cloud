import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { ApiResponse } from '@umcp/shared';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const url: string = request?.url || '';

    // MCP routes must return raw JSON-RPC — do NOT wrap
    if (url.startsWith('/mcp/') || url.includes('/mcp/')) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => {
        // If the response already has the success shape, pass through
        if (
          data &&
          typeof data === 'object' &&
          'success' in (data as object)
        ) {
          return data as unknown as ApiResponse<T>;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
