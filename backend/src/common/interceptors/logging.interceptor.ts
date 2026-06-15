import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs one line per request on completion: `METHOD url → status (Nms)`.
 *
 * Duration is wall-clock via `Date.now()` (this is Node application code, so
 * `Date.now()` is available and appropriate).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = http.getResponse<Response>();
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} → ${response.statusCode} (${ms}ms)`);
      }),
    );
  }
}
