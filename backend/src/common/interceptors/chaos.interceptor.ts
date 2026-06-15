import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class ChaosInterceptor implements NestInterceptor {
  // TRADE-OFF: simulates a flaky downstream so the UI's optimistic-rollback + retry are demonstrable.
  constructor(
    private readonly config: ConfigService,
    private readonly rng: () => number = Math.random,
  ) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const enabled = this.config.get<boolean>('CHAOS_ENABLED');
    if (!enabled) return next.handle();
    const rate = this.config.get<number>('CHAOS_FAILURE_RATE') ?? 0.15;
    const latency = 100 + Math.floor(this.rng() * 700); // 100–800ms
    return timer(latency).pipe(
      mergeMap(() =>
        this.rng() < rate
          ? throwError(() => new ServiceUnavailableException('Simulated downstream failure'))
          : next.handle(),
      ),
    );
  }
}
