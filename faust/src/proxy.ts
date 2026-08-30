import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const LOGIN_PATH = "/admin/login";

export const proxy = (request: NextRequest) => {
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === LOGIN_PATH;

  if (!hasCookie && !isLogin) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
