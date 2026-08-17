import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * A shortcut, not a lock.
 *
 * All this does is spare a signed-out visitor a round trip to the API: the
 * presence of a cookie says nothing about whether it is still valid. The real
 * check is `requireAdmin()` inside the route, and the real boundary is the
 * Python API (§3.5).
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the old filename
 * still works but warns on every build.
 */

const LOGIN_PATH = "/admin/login";

export const proxy = (request: NextRequest) => {
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === LOGIN_PATH;

  if (!hasCookie && !isLogin) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (hasCookie && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
