import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const request = (path: string, withCookie = false) => {
  const next = new NextRequest(`https://faust.bar${path}`);

  if (withCookie) next.cookies.set(SESSION_COOKIE, "jwt-token");

  return next;
};

const locationOf = (response: Response) => response.headers.get("location");

describe("proxy", () => {
  it("sends a visitor without a cookie to the login form", () => {
    const response = proxy(request("/admin"));

    expect(locationOf(response)).toBe("https://faust.bar/admin/login");
  });

  it("guards nested admin routes the same way", () => {
    const response = proxy(request("/admin/items/9f3a"));

    expect(locationOf(response)).toBe("https://faust.bar/admin/login");
  });

  it("lets the login form itself through", () => {
    const response = proxy(request("/admin/login"));

    expect(locationOf(response)).toBeNull();
  });

  it("lets a cookie holder reach the login form, so an expired session cannot loop", () => {
    // The regression: bouncing anyone with a cookie back to /admin sent a dead
    // token ping-ponging between the two pages, because the panel sends it here
    // and this used to send it straight back. Deciding that direction needs the
    // API, and the login page is the one that asks.
    const response = proxy(request("/admin/login", true));

    expect(locationOf(response)).toBeNull();
  });

  it("waves through a request that carries a cookie", () => {
    const response = proxy(request("/admin", true));

    expect(locationOf(response)).toBeNull();
  });
});
