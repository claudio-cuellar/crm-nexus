import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Filled by later phases — declared now so there is ONE place to audit config:
  DATABASE_URL: z.string().url().optional(),                 // Phase 2
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),  // Phase 3
  CLERK_SECRET_KEY: z.string().optional(),                   // Phase 3
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),       // Phase 3
  AWS_ENDPOINT_URL: z.string().url().optional(),             // Phase 6 (MiniStack S3)
  AWS_REGION: z.string().default("us-east-1"),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast at boot; print ONLY key names — values may be secrets.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration → ${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();