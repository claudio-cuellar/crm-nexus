import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "./env";

export interface LogFields {
  [key: string]: unknown;
}

export const logContext = new AsyncLocalStorage<{ requestId: string }>();

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type LogLevel = keyof typeof LEVEL_ORDER;

const THRESHOLD = LEVEL_ORDER[env.LOG_LEVEL];

/** Never log credentials/tokens (ADR-013/Phase 9 red line). Key-name based — values are dropped whole. */
const REDACTED_KEY = /^(authorization|cookie|set-cookie|password\w*|\w*password\w*|secret\w*|\w*secret\w*|\w*token\w*|apikey\w*|api_key\w*|\w*access_key)$/i;

function scrub(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED_KEY.test(key)) {
      out[key] = "[redacted]";
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = scrub(value as LogFields);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (LEVEL_ORDER[level] < THRESHOLD) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    requestId: logContext.getStore()?.requestId,
    ...scrub(fields),
  };
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(JSON.stringify(line));
}