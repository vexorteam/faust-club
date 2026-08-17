import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import { clearSessionCookie, readSessionToken } from "@/lib/session";

/**
 * Ends the session. The API bumps `token_version`, which kills every token
 * issued so far; the cookie is dropped here.
 *
 * The cookie is cleared even if the API call fails — a browser that keeps a
 * token nobody accepts is worse than a browser with no token at all.
 */

const logoutResponseSchema = z.unknown();

export const POST = async () => {
  const token = await readSessionToken();

  if (token) {
    try {
      await apiRequest("/api/v1/auth/logout", logoutResponseSchema, {
        method: "POST",
        token,
        cache: "no-store",
      });
    } catch (error) {
      console.error("[auth] the API did not confirm the logout, dropping the cookie anyway", error);
    }
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
};
