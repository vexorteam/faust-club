import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api";
import { setSessionCookie } from "@/lib/session";
import { loginResponseSchema, loginSchema } from "@/schemas/auth";
import { AppError, UnauthorizedError, toActionResult } from "@/errors";

/**
 * Proxy for `POST /api/v1/auth/login`.
 *
 * The password lives for exactly one hop — browser → here → API — and is
 * never logged or stored. The token never travels back to the browser in the
 * body either: it goes straight into an httpOnly cookie (§5.4).
 */

/** One message for a wrong password and for an unknown address alike. */
const CREDENTIALS_MESSAGE = "Невірна пошта або пароль";

const rejected = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, code, message }, { status });

export const POST = async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return rejected("VALIDATION_ERROR", CREDENTIALS_MESSAGE, 400);
  }

  const credentials = loginSchema.safeParse(payload);

  if (!credentials.success) {
    return rejected("VALIDATION_ERROR", CREDENTIALS_MESSAGE, 400);
  }

  try {
    const { token, expiresIn, user } = await apiRequest("/api/v1/auth/login", loginResponseSchema, {
      method: "POST",
      body: credentials.data,
      cache: "no-store",
    });

    await setSessionCookie(token, expiresIn);

    return NextResponse.json({ ok: true, data: { name: user.name } });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return rejected("UNAUTHORIZED", CREDENTIALS_MESSAGE, 401);
    }

    const failure = toActionResult(error);

    return NextResponse.json(failure, { status: error instanceof AppError ? error.status : 500 });
  }
};
