import {
  AppError,
  ValidationFailed,
  appHttpStatus,
  errorTitle,
  errorTypeUri,
  type AppErrorCode,
  type FieldIssue,
} from '@/shared/kernel/errors';
import { log } from "@/shared/infrastructure/logger";

export interface ProblemDetails {
  [key: string]: unknown;
  
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: AppErrorCode;
  requestId: string;
  errors?: FieldIssue[];
}

export function toProblemDetails(err: unknown, requestId: string, instance?: string): ProblemDetails {
  if (err instanceof AppError) {
    const problems: ProblemDetails = {
      type: errorTypeUri(err.code),
      title: errorTitle(err.code),
      status: appHttpStatus(err.code),
      detail: err.message,
      instance,
      code: err.code,
      requestId,
    };
    if (err instanceof ValidationFailed) {
      problems.errors = err.issues; // paths+messages ONLY — never echo raw input values (mistake #4)
    }
    if (err.extras) {
      // extras must be safe-by-construction: only add reviewed, non-sensitive fields at throw sites
      (problems as Record<string, unknown>).extras = err.extras;
    }
    return problems;
  }

  // Unknown error: log FULL detail (internal), expose NOTHING but the stable envelope.
  log("error", "unhandled_error", {
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err),
    stack: process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined,
    instance,
  });
  return {
    type: errorTypeUri("internal_error"),
    title: errorTitle("internal_error"),
    status: 500,
    detail: "An unexpected error occurred. The incident was logged.",
    instance,
    code: "internal_error",
    requestId,
  };
}

export function problemResponse(err: unknown, requestId: string, instance?: string): Response {
  const body = toProblemDetails(err, requestId, instance);
  return Response.json(body, {
    status: body.status,
    headers: {
      "content-type": "application/problem+json; charset=utf-8",
      "x-request-id": requestId,
    },
  });
}