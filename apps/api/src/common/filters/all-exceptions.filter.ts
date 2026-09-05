import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '@umcp/shared';
import { createLogger } from '@umcp/logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = createLogger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: unknown;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;

      if (!exception.isOperational) {
        this.logger.error({ err: exception, path: request.url }, 'Non-operational error');
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      code = `HTTP_${statusCode}`;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        details = resp.errors || resp.details;

        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          details = resp.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error(
        {
          err: exception instanceof Error ? exception : new Error(String(exception)),
          path: request.url,
          method: request.method,
        },
        'Unhandled exception',
      );
    }

    const correlationId = (request as any).correlationId || request.headers['x-correlation-id'];

    // MCP routes must return raw JSON-RPC error responses
    if (request.url?.includes('/mcp/')) {
      const rpcId = request.body?.id !== undefined ? request.body.id : null;
      response.status(200).json({
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: statusCode === 401 ? -32001 : -32603,
          message,
        },
      });
      return;
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        ...(correlationId ? { requestId: correlationId } : {}),
      },
    });
  }
}
