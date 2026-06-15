import { z } from 'zod';

/**
 * Coerce a string env var (`'true'` / `'false'`) into a boolean.
 *
 * We intentionally avoid `z.coerce.boolean()` here: it applies JS `Boolean()`
 * semantics, where the non-empty string `'false'` coerces to `true`. This
 * explicit transform treats only the literal `'true'` as true.
 */
const booleanFromString = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((value) => (typeof value === 'boolean' ? value : value === 'true'));

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CHAOS_ENABLED: booleanFromString(true),
  CHAOS_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.15),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3001),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validation hook for `ConfigModule.forRoot({ validate })`.
 *
 * Receives the raw `process.env`-shaped object, returns the parsed/typed
 * config, and throws a readable error if validation fails.
 */
export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
