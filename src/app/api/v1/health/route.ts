import { z } from "zod";
import type { NextRequest } from "next/server";
import { handle } from "@/shared/http/handle";
import { AppError } from "@/shared/kernel/errors";

// export const dynamic = "force-dynamic"; // ← CRITICAL on Next 16.4: route handlers get prerendered at build without this — your ?fail= would never execute (see release notes "Prerender route handlers")

const querySchema = z.object({
  fail: z.enum([
    "validation_failed",
    "authentication_required",
    "permission_denied",
    "tenant_mismatch",
    "no_active_organization",
    "resource_not_found",
    "state_conflict",
    "idp_unavailable",
    "internal_error",
  ]).optional(),
});

export async function GET(req: NextRequest) {
  return handle(req, {
    query: querySchema,
    run: ({ query }) => {
      if (query.fail) {
        // Dev/demo only — the enum gate above means unknown codes can NEVER reach here as 500s;
        // and production strips the capability entirely:
        if (process.env.NODE_ENV === "production") {
          return { ok: true, version: process.env.npm_package_version ?? "0.0.0", checks: { app: "pass", db: "pending" } };
        }
        throw new AppError(query.fail, `Simulated failure: ${query.fail}`);
      }
      return {
        ok: true,
        version: process.env.npm_package_version ?? "0.0.0",
        checks: { app: "pass", db: "pending" },
      };
    },
  });
}