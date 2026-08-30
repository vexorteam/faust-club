import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, ValidationError, toActionResult } from "@/errors";
import { describeUploadProblem } from "@/schemas/image";

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

export const parseBody = <T>(schema: z.ZodType<T>, payload: unknown): T => {
  const parsed = schema.safeParse(payload);

  if (parsed.success) return parsed.data;

  const fieldErrors = collectFieldErrors(parsed.error.issues);
  const firstIssue = parsed.error.issues[0];

  throw new ValidationError(firstIssue?.message ?? INVALID_MESSAGE, fieldErrors);
};

const UPLOAD_MESSAGE = "Не вдалося прочитати завантажений файл";

export const readUpload = async (request: Request): Promise<FormData> => {
  try {
    return await request.formData();
  } catch {
    throw new ValidationError(UPLOAD_MESSAGE, { file: UPLOAD_MESSAGE });
  }
};

export const takeFile = (form: FormData, name = "file"): File => {
  const value = form.get(name);
  const file = value instanceof File ? value : null;
  const problem = describeUploadProblem(file);

  if (problem || !file) throw new ValidationError(problem ?? UPLOAD_MESSAGE, { [name]: problem ?? UPLOAD_MESSAGE });

  return file;
};

/** A text part of the same form, validated by the schema the form itself used. */
export const takeText = (form: FormData, name: string, schema: z.ZodType<string>): string => {
  const value = form.get(name);
  const parsed = schema.safeParse(typeof value === "string" ? value : "");

  if (parsed.success) return parsed.data;

  const message = parsed.error.issues[0]?.message ?? INVALID_MESSAGE;

  throw new ValidationError(message, { [name]: message });
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
