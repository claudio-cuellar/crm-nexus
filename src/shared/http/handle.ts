import { type NextRequest } from "next/server";
import type { z, ZodType } from "zod";
import type { RequestContext } from "@/shared/kernel/context";
import { AppError, ValidationFailed, type FieldIssue } from "@/shared/kernel/errors";
import { log, logContext } from "@/shared/infrastructure/logger";
import { problemResponse } from "./problem";

type Infer<S> = S extends ZodType ? S["_output"] : Record<string, never>;

export interface HandleOptions<Q extends ZodType | undefined = undefined, B extends ZodType | undefined = undefined> {
  /** Phase-3 seam: when true, verification replaces the dev stub below. Routes WITHOUT auth default to public — every protected route must opt in explicitly and be code-reviewed. */
  auth?: true;
  query?: Q;
  body?: B;
  run: (input: { ctx: RequestContext; query: Infer<Q>; body: Infer<B> }) =>
    | Promise<Response>
    | Promise<unknown>
    | unknown;
}

function zodIssues(err: z.ZodError): FieldIssue[] {
  return err.issues.map((i) => ({
    path: i.path.length ? i.path.map(String).join(".") : "(root)",
    message: i.message,
  }));
}

function json(data: unknown, status: number, requestId: string): Response {
  return Response.json(data as object, {
    status,
    headers: { "x-request-id": requestId, "content-type": "application/json; charset=utf-8" },
  });
}

export async function handle<Q extends ZodType | undefined = undefined, B extends ZodType | undefined = undefined>(
  req: NextRequest,
  opts: HandleOptions<Q, B>,
): Promise<Response> {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  return logContext.run({ requestId }, async () => {
    const start = performance.now();
    const route = `${req.method} ${req.nextUrl.pathname}`;
    try {
      let ctx: RequestContext = { requestId };

      // ── AUTH SEAM (Phase 3) ───────────────────────────────────────────────
      // Until Clerk lands: auth:true routes receive an explicit dev stub.
      // Phase 3 replaces ONLY this block (verify session → AuthenticationRequired / IdpUnavailable).
      if (opts.auth) {
        ctx = { ...ctx, auth: { userId: "dev_stub_user", platformAdmin: false } };
      }
      // ──────────────────────────────────────────────────────────────────────

      // Query: flat parse (multi-value params arrive as arrays in searchParams — revisit in Phase 8 list endpoints)
      let query = {} as Infer<Q>;
      if (opts.query) {
        const parsed = opts.query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
        if (!parsed.success) throw new ValidationFailed(zodIssues(parsed.error));
        query = parsed.data as Infer<Q>;
      }

      // Body: only for write methods; strict JSON content-type
      let body = {} as Infer<B>;
      if (opts.body && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const contentType = req.headers.get("content-type") ?? "";
        if (!contentType.startsWith("application/json")) {
          throw new ValidationFailed([{ path: "(request)", message: "Content-Type must be application/json" }]);
        }
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new ValidationFailed([{ path: "(body)", message: "Body is not valid JSON" }]);
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) throw new ValidationFailed(zodIssues(parsed.error));
        body = parsed.data as Infer<B>;
      }

      const result = await opts.run({ ctx, query, body });

      const response = result instanceof Response ? result : json(result, 200, requestId);
      response.headers.set("x-request-id", requestId);
      log("info", "request", { route, status: response.status, ms: Math.round(performance.now() - start) });
      return response;
    } catch (err) {
      const status = err instanceof AppError ? err.status : 500;
      log("info", "request_error", {
        route,
        status,
        code: err instanceof AppError ? err.code : "internal_error",
        ms: Math.round(performance.now() - start),
      });
      return problemResponse(err, requestId, req.nextUrl.pathname); // instance = path
    }
  });
}