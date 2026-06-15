import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** Smallest HTTP status that counts as a server-side (5xx) error. */
const SERVER_ERROR_THRESHOLD = 500;

interface ErrorEnvelope {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Catch-all filter producing a stable error envelope for the frontend.
 *
 * `@Catch()` (no args) catches everything: known `HttpException`s are unwrapped
 * to their status + message; anything else is treated as an unexpected 500 with
 * a generic message (never leak internals). 5xx responses are logged.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, error } = this.resolveMessage(exception, status);

    const envelope: ErrorEnvelope = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= SERVER_ERROR_THRESHOLD) {
      // Log the original exception (with stack when available) for 5xx only.
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${request.method} ${request.url} → ${status} ${message}`, stack);
    }

    response.status(status).json(envelope);
  }

  /**
   * Extract a human-readable `message` and short `error` label from the thrown
   * value. Nest's `HttpException` response is either a string or an object that
   * may carry `message` (string | string[]) and `error` fields.
   */
  private resolveMessage(exception: unknown, status: number): { message: string; error: string } {
    const defaultError = HttpStatus[status] ?? 'Error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { message: res, error: defaultError };
      }
      if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        const raw = body.message;
        const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? exception.message);
        return { message, error: body.error ?? defaultError };
      }
      return { message: exception.message, error: defaultError };
    }

    // Unknown error: never leak internals to the client.
    return { message: 'Internal server error', error: defaultError };
  }
}
