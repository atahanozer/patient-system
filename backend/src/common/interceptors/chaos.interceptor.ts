import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
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
    // @Optional: Nest sees `rng` in the emitted ctor metadata (typed Function via its
    // default) and would otherwise try to inject it and fail. Mark it optional so DI
    // skips it and the Math.random default applies; tests still pass a custom rng.
    @Optional() private readonly rng: () => number = Math.random,
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
