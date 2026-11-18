import { describe, it, expect, afterEach, vi } from "vitest";
import {
  PermissionDenied, ValidationFailed, StateConflict,
} from "@/shared/kernel/errors";
import { problemResponse, type ProblemDetails } from "@/shared/http/problem";

async function bodyOf(res: Response): Promise<ProblemDetails & Record<string, unknown>> {
  return (await res.json()) as ProblemDetails & Record<string, unknown>;
}

afterEach(() => vi.restoreAllMocks());

describe("problemResponse", () => {
  it("maps AppError subclasses to RFC 9457 with our extensions", async () => {
    const res = problemResponse(new PermissionDenied("deals:manage"), "req-1", "/api/v1/deals");
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toBe("application/problem+json; charset=utf-8");
    expect(res.headers.get("x-request-id")).toBe("req-1");
    const body = await bodyOf(res);
    expect(body).toMatchObject({
      type: "https://errors.nexus.test/permission_denied",
      title: "Permission Denied",
      status: 403,
      instance: "/api/v1/deals",
      code: "permission_denied",
      requestId: "req-1",
      extras: { permission: "deals:manage" },
    });
  });

  it("validation issues appear ONCE, in errors[] — never duplicated in extras (Finding A guard)", async () => {
    const res = problemResponse(new ValidationFailed([{ path: "fail", message: "Invalid option" }]), "req-2");
    const body = await bodyOf(res);
    expect(body.errors).toEqual([{ path: "fail", message: "Invalid option" }]);
    expect(body.extras).toBeUndefined();                       // ← contract pin
    const raw = JSON.stringify(body);
    expect(raw.match(/Invalid option/g)?.length).toBe(1);      // belt: appears exactly once
  });

  it("unknown errors are redacted externally and logged internally", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = problemResponse(new Error("SQL bomb secret-column leaked at conn pool"), "req-3", "/x");
    expect(res.status).toBe(500);
    const body = await bodyOf(res);
    expect(body.code).toBe("internal_error");
    expect(body.detail).toBe("An unexpected error occurred. The incident was logged.");
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("SQL");
    expect(raw).not.toContain("secret-column");
    expect(body.requestId).toBe("req-3");
    expect(errSpy).toHaveBeenCalled();                          // the detail went to logs instead
    const logged = errSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(logged).toContain("unhandled_error");
    expect(logged).toContain("secret-column");              // redaction applies to logs too — key name 'errorMessage' is safe, value contains it; we assert the shape we chose
  });

  it("StateConflict carries reviewed extras only", async () => {
    const body = await bodyOf(problemResponse(new StateConflict("Deal already closed", { dealId: "d1" }), "r"));
    expect(body.status).toBe(409);
    expect((body.extras as Record<string, unknown>).dealId).toBe("d1");
  });
});