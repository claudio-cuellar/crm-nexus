import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

/** Accept client ids only when they are log-safe and bounded — header-fuzzing must not poison the log sink. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function proxy(req: NextRequest) {
  const inbound = req.headers.get("x-request-id");
  const requestId = inbound && SAFE_REQUEST_ID.test(inbound) ? inbound : randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId); // response-side echo: curl -i must see it (mistake #3)
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};