import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, ValidationError, toActionResult } from "@/errors";

/**
 * Shared plumbing of the admin route handlers.
 *
 * Every write from the admin UI goes through the same three steps: read the
 * body, validate it with the schema the form itself used, call the API. The
 * answer is always the same envelope, so one client-side helper can handle all
 * of them — and a failure never carries a stack trace to the browser (§9).
 */

const INVALID_MESSAGE = "Перевірте заповнені поля";

export const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

/** Zod issues, keyed by field, so the form can put each message under its input. */
const collectFieldErrors = (issues: readonly z.core.$ZodIssue[]): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
  }

  return errors;
};

/**
 * Validation on this side is a convenience, not a boundary: the API checks the
 * same bounds again and is the one that decides (§3.5). It exists so a typo
 * does not need a round trip to be reported.
 */
export const parseBody = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const parsed = schema.safeParse(payload);

  if (parsed.success) return parsed.data;

  const fieldErrors = collectFieldErrors(parsed.error.issues);
  const firstIssue = parsed.error.issues[0];

  throw new ValidationError(firstIssue?.message ?? INVALID_MESSAGE, fieldErrors);
};

/**
 * Runs an admin action and reports it in the shape the client expects:
 * `{ ok: true, data }` or the `ActionFailure` from `toActionResult()`.
 */
export const adminRoute = async <T>(run: () => Promise<T>): Promise<NextResponse> => {
  try {
    const data = await run();

    return NextResponse.json({ ok: true, data: data ?? null });
  } catch (error) {
    const failure = toActionResult(error);

    return NextResponse.json(failure, { status: error instanceof AppError ? error.status : 500 });
  }
};
