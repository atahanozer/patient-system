import { CallHandler, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, of } from 'rxjs';
import { ChaosInterceptor } from './chaos.interceptor';

/**
 * Build a ConfigService stub whose `get` returns values from a lookup map.
 */
function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const next: CallHandler = { handle: () => of('OK') };
const ctx = {} as ExecutionContext;

/**
 * Make a deterministic rng from a queue of numbers; the last value repeats once
 * the queue is exhausted so a missing call never blows up the test.
 */
function queuedRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[Math.min(i, values.length - 1)] ?? 0;
    i += 1;
    return value;
  };
}

describe('ChaosInterceptor', () => {
  it('passes through immediately when disabled', async () => {
    const config = makeConfig({ CHAOS_ENABLED: false });
    const handleSpy = jest.spyOn(next, 'handle');
    const interceptor = new ChaosInterceptor(config, queuedRng([0, 0]));

    const result = await firstValueFrom(interceptor.intercept(ctx, next));

    expect(result).toBe('OK');
    expect(handleSpy).toHaveBeenCalledTimes(1);
    handleSpy.mockRestore();
  });

  it('throws ServiceUnavailable when rng < failure rate', async () => {
    const config = makeConfig({ CHAOS_ENABLED: true, CHAOS_FAILURE_RATE: 0.15 });
    // First rng (0) → ~100ms latency; second rng (0) < 0.15 → fail.
    const interceptor = new ChaosInterceptor(config, queuedRng([0, 0]));

    await expect(firstValueFrom(interceptor.intercept(ctx, next))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('passes when rng >= failure rate', async () => {
    const config = makeConfig({ CHAOS_ENABLED: true, CHAOS_FAILURE_RATE: 0.15 });
    // First rng (0) → ~100ms latency; second rng (0.99) >= 0.15 → pass.
    const interceptor = new ChaosInterceptor(config, queuedRng([0, 0.99]));

    const result = await firstValueFrom(interceptor.intercept(ctx, next));

    expect(result).toBe('OK');
  });
});
