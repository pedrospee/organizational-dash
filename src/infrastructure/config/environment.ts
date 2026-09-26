import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Environment = z.infer<typeof environmentSchema>;

export class InvalidEnvironmentError extends Error {
  constructor(issues: string) {
    super(`Invalid environment configuration:\n${issues}`);
    this.name = "InvalidEnvironmentError";
  }
}

/**
 * Validates environment variables once at startup so the rest of the
 * application can rely on a typed, known-good configuration.
 */
export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new InvalidEnvironmentError(z.prettifyError(result.error));
  }

  return result.data;
}
