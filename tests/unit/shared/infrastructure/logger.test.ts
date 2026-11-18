import { describe, it, expect, afterEach, vi } from "vitest";
import { log, logContext } from "@/shared/infrastructure/logger";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("emits one JSON line per call, auto-merging ALS requestId", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => { });
    logContext.run({ requestId: "trace-abc" }, () => {
      log("info", "request", { route: "GET /x", status: 200 });
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({ level: "info", message: "request", requestId: "trace-abc", route: "GET /x" });
    expect(typeof line.ts).toBe("string");
  });

  it("redacts secret-shaped keys at any nesting depth", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => { });
    log("info", "cfg", {
      authorization: "Bearer super-secret",
      user: { client_secret: "s3cr3t", displayName: "Claudio" },
      password_hash: "x",
      keepMe: "visible",
    });
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line.authorization).toBe("[redacted]");
    expect(line.user.client_secret).toBe("[redacted]");
    expect(line.password_hash).toBe("[redacted]");
    expect(line.user.displayName).toBe("Claudio");
    expect(line.keepMe).toBe("visible");
  });

  it("logs outside a store without crashing (requestId absent)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => { });
    log("info", "boot", {});
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line.message).toBe("boot");
    expect("requestId" in line).toBe(false);   // key present, value undefined → JSON drops it
  });

  it("respects the level threshold (default env: info → debug suppressed)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => { });
    log("debug", "noise", {});
    log("info", "signal", {});
    const messages = spy.mock.calls.map((c) => JSON.parse(String(c[0])).message as string);
    expect(messages).toEqual(["signal"]);
  });
});