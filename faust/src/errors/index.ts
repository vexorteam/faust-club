import { pluralize } from "@/lib/format";

/**
 * Error hierarchy shared by the whole frontend.
 *
 * Most of these errors are never *thrown* here — they are produced by the
 * Python API, delivered as `{ error: { code, message, fields } }` and turned
 * back into classes by `lib/api.ts`. The exception is `ApiUnavailableError`,
 * which the frontend raises on its own when the backend does not answer or
 * answers with something unreadable.
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 400;
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly status = 403;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly status = 404;
}

export class SlugConflictError extends AppError {
  readonly code = "SLUG_CONFLICT";
  readonly status = 409;

  static forSlug(slug: string): SlugConflictError {
    return new SlugConflictError(`Категорія з адресою "${slug}" уже існує. Оберіть іншу`);
  }
}

export class CategoryNotEmptyError extends AppError {
  readonly code = "CATEGORY_NOT_EMPTY";
  readonly status = 409;

  static forCategory(title: string, itemsCount: number): CategoryNotEmptyError {
    const noun = pluralize(itemsCount, "позиція", "позиції", "позицій");

    return new CategoryNotEmptyError(
      `У категорії "${title}" ще ${itemsCount} ${noun}. Перенесіть або видаліть їх спочатку`,
    );
  }
}

export class FileTooLargeError extends AppError {
  readonly code = "FILE_TOO_LARGE";
  readonly status = 413;

  static forSize(sizeMb: number, limitMb: number): FileTooLargeError {
    return new FileTooLargeError(`Файл ${sizeMb.toFixed(1)} МБ. Максимум — ${limitMb} МБ`);
  }
}

export class UnsupportedFileError extends AppError {
  readonly code = "UNSUPPORTED_FILE";
  readonly status = 415;
}

export class RateLimitError extends AppError {
  readonly code = "RATE_LIMITED";
  readonly status = 429;
}

export class StorageError extends AppError {
  readonly code = "STORAGE_ERROR";
  readonly status = 500;
}

export class DatabaseError extends AppError {
  readonly code = "DATABASE_ERROR";
  readonly status = 500;
}

/** Raised by the frontend itself: the API did not answer, or answered with garbage. */
export class ApiUnavailableError extends AppError {
  readonly code = "API_UNAVAILABLE";
  readonly status = 503;
}

type AppErrorConstructor = new (message: string, details?: unknown) => AppError;

/**
 * Shared dictionary of both applications: a new code in the API means a new
 * entry here. `INVALID_CREDENTIALS` intentionally collapses into
 * `UnauthorizedError` — the login form shows one message either way.
 */
const errorsByCode: Record<string, AppErrorConstructor> = {
  VALIDATION_ERROR: ValidationError,
  UNAUTHORIZED: UnauthorizedError,
  INVALID_CREDENTIALS: UnauthorizedError,
  FORBIDDEN: ForbiddenError,
  NOT_FOUND: NotFoundError,
  SLUG_CONFLICT: SlugConflictError,
  CATEGORY_NOT_EMPTY: CategoryNotEmptyError,
  FILE_TOO_LARGE: FileTooLargeError,
  UNSUPPORTED_FILE: UnsupportedFileError,
  RATE_LIMITED: RateLimitError,
  STORAGE_ERROR: StorageError,
  DATABASE_ERROR: DatabaseError,
  API_UNAVAILABLE: ApiUnavailableError,
};

const FALLBACK_MESSAGE = "Щось пішло не так на нашому боці. Спробуйте ще раз за хвилину";

/** Turns an API error envelope into a typed exception. Unknown codes stay generic. */
export const fromErrorCode = (code: string, message: string, details?: unknown): AppError => {
  const Constructor = errorsByCode[code];
  const text = message.trim().length > 0 ? message : FALLBACK_MESSAGE;

  if (!Constructor) return new ApiUnavailableError(text, details);

  return new Constructor(text, details);
};

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

const isFieldErrors = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((item) => typeof item === "string");

/**
 * The only way an admin action reports failure to the client: a human message
 * and a machine code, never a stack trace. The full context goes to the logs.
 */
export const toActionResult = (error: unknown): ActionFailure => {
  if (error instanceof AppError) {
    console.error(`[action] ${error.code}: ${error.message}`, error.details ?? "");

    const fieldErrors = isFieldErrors(error.details) ? error.details : undefined;

    return fieldErrors
      ? { ok: false, code: error.code, message: error.message, fieldErrors }
      : { ok: false, code: error.code, message: error.message };
  }

  console.error("[action] unexpected error", error);

  return { ok: false, code: "UNKNOWN", message: FALLBACK_MESSAGE };
};
