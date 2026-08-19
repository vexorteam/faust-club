import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiRequest, type SessionRenewal } from "@/lib/api";
import { meResponseSchema } from "@/schemas/auth";
import { ForbiddenError, UnauthorizedError } from "@/errors";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import type { AdminUser } from "@/types";

/**
 * Everything the frontend knows about being signed in (§5.4).
 *
 * The token is opaque here: it is stored in an httpOnly cookie, attached to
 * API calls and never inspected. Only the Python API decides whether it is
 * still valid — the frontend just believes the answer.
 */

export { SESSION_COOKIE };

const EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз";

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

/** Reads the raw token. Server-only: the cookie is invisible to client JS. */
export const readSessionToken = async (): Promise<string | null> => {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
};

/** Route handlers only — Server Components are not allowed to write cookies. */
export const setSessionCookie = async (token: string, maxAgeSeconds: number): Promise<void> => {
  const store = await cookies();

  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
};

/**
 * Sliding renewal (§5.4): with less than a day left the API answers with a
 * fresh token, and the cookie is rewritten without the owner noticing.
 *
 * Only a route handler may write cookies, so a renewal that arrives while a
 * page is rendering is dropped. That costs nothing — the token it would have
 * replaced is still valid for another day, and the next write renews it.
 */
export const applySessionRenewal = async (renewal: SessionRenewal | null): Promise<boolean> => {
  if (!renewal) return false;

  try {
    await setSessionCookie(renewal.token, renewal.expiresIn);

    return true;
  } catch {
    return false;
  }
};

export const clearSessionCookie = async (): Promise<void> => {
  const store = await cookies();

  store.delete(SESSION_COOKIE);
};

/**
 * Who is signed in, or `null` if nobody is. A dead or expired token is the
 * same as no session at all; an API that is merely down is not — that error
 * travels up instead of quietly logging the owner out.
 *
 * Cached per request: the layout and the page it wraps both check the session,
 * and that must not cost two round trips to the API.
 */
export const getSession = cache(async (): Promise<AdminUser | null> => {
  const token = await readSessionToken();

  if (!token) return null;

  try {
    const { user } = await apiRequest("/api/v1/auth/me", meResponseSchema, {
      token,
      cache: "no-store",
    });

    return user;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return null;
    }

    throw error;
  }
});

/**
 * Guard for every admin route. Throws instead of returning `null`, so a
 * forgotten check cannot silently render a page to a stranger.
 */
export const requireAdmin = async (): Promise<AdminUser> => {
  const user = await getSession();

  if (!user) throw new UnauthorizedError(EXPIRED_MESSAGE);

  return user;
};

/**
 * The same guard, worn by pages: an expired session sends the owner back to
 * the login form instead of onto an error screen. Anything that is not an
 * expired session (a backend that is down, say) still travels up — silently
 * signing someone out because the API hiccupped would be a lie.
 */
export const requireAdminOrRedirect = async (): Promise<AdminUser> => {
  let user: AdminUser | null = null;

  try {
    user = await requireAdmin();
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  }

  if (!user) redirect(ADMIN_LOGIN_PATH);

  return user;
};

/**
 * The mirror of `requireAdminOrRedirect()`, worn by the login page: whoever
 * already has a live session has nothing to do on the form.
 *
 * It asks the API rather than looking for a cookie, and that is the whole
 * point. `proxy.ts` used to bounce anyone holding a cookie back to `/admin`,
 * so a token that died over the week ping-ponged between the two pages until
 * the browser gave up — and a week is exactly how long a token lives (§5.4),
 * with an owner who signs in about that often. The check that decides now is
 * the same one the panel itself trusts, so the two cannot disagree.
 *
 * An API that is merely unreachable leaves the form on screen. Signing in will
 * not work either way, but a form that says so beats an error page.
 */
export const redirectIfSignedIn = async (): Promise<void> => {
  let user: AdminUser | null = null;

  try {
    user = await getSession();
  } catch {
    return;
  }

  // Outside the `try`: `redirect()` works by throwing, and catching it here
  // would swallow the redirect itself.
  if (user) redirect(ADMIN_HOME_PATH);
};
