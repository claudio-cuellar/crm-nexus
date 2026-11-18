import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function call(headers: Record<string, string> = {}) {
  return proxy(new NextRequest("http://localhost/api/v1/health", { headers }));
}

describe("proxy request-id policy", () => {
  it("accepts a well-formed inbound id (echoed response-side)", () => {
    expect(call({ "x-request-id": "trace-me-123" }).headers.get("x-request-id")).toBe("trace-me-123");
  });
  it("rejects ids with unsafe characters → fresh UUID", () => {
    expect(call({ "x-request-id": "bad id/with spaces!!" }).headers.get("x-request-id")).toMatch(UUID_RE);
  });
  it("rejects oversized ids (65 chars) but accepts 64", () => {
    expect(call({ "x-request-id": "a".repeat(65) }).headers.get("x-request-id")).toMatch(UUID_RE);
    expect(call({ "x-request-id": "a".repeat(64) }).headers.get("x-request-id")).toBe("a".repeat(64));
  });
  it("generates a UUID when absent", () => {
    expect(call().headers.get("x-request-id")).toMatch(UUID_RE);
  });
});