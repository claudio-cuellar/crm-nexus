import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/v1/health/route";

const URL_BASE = "http://localhost/api/v1/health";
afterEach(() => vi.restoreAllMocks());

function req(qs = "", headers: Record<string, string> = {}) {
  return new NextRequest(`${URL_BASE}${qs}`, { headers });
}

describe("GET /api/v1/health", () => {
  it("200 JSON with contract shape and echoed request id", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req("?x=1", { "x-request-id": "h-1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("h-1");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, checks: { app: "pass", db: "pending" } });
    expect(typeof body.version).toBe("string");
  });

  it("dev fail-lever produces the right Problem Details", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req("?fail=permission_denied"));
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ code: "permission_denied", status: 403 });
  });

  it("unknown fail code → 400 validation with single-source errors[] (Finding A e2e)", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req("?fail=bogus"));
    expect(res.status).toBe(400);
    const raw = await res.text();
    expect(raw.match(/Invalid option/g)?.length).toBe(1);
  });

  it("request id fallback: none supplied → response carries a UUID", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req());
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
  });
});