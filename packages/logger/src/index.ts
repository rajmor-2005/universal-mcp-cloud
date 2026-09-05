/**
 * @umcp/logger — Structured logging with Pino.
 * Provides a root logger and child-logger factory for per-service / per-request logging.
 */

import pino from 'pino';
import type { Logger as PinoLogger, LoggerOptions } from 'pino';

export type Logger = PinoLogger;

const isDev = process.env['NODE_ENV'] !== 'production';

const defaultOptions: LoggerOptions = {
  level: process.env['LOG_LEVEL'] || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  serializers: {
    err: pino.stdSerializers.err,
    req: (req: Record<string, unknown>) => ({
      method: req['method'],
      url: req['url'],
      headers: {
        host: (req['headers'] as Record<string, unknown>)?.['host'],
        'user-agent': (req['headers'] as Record<string, unknown>)?.['user-agent'],
      },
    }),
    res: (res: Record<string, unknown>) => ({
      statusCode: res['statusCode'],
    }),
  },
  base: {
    service: process.env['APP_NAME'] || 'umcp',
    env: process.env['NODE_ENV'] || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  redact: {
    paths: [
      'password',
      'secret',
      'token',
      'authorization',
      'apiKey',
      'refreshToken',
      'accessToken',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
};

/**
 * Root application logger.
 */
export const rootLogger: Logger = pino(defaultOptions);

/**
 * Create a child logger scoped to a service or module.
 */
export function createLogger(context: string, bindings?: Record<string, unknown>): Logger {
  return rootLogger.child({
    context,
    ...bindings,
  });
}

/**
 * Create a request-scoped logger with correlation ID.
 */
export function createRequestLogger(
  correlationId: string,
  context?: string,
  bindings?: Record<string, unknown>,
): Logger {
  return rootLogger.child({
    correlationId,
    ...(context ? { context } : {}),
    ...bindings,
  });
}

export default rootLogger;
