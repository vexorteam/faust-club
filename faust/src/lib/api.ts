import { z } from "zod";
import { ApiUnavailableError, fromErrorCode, type AppError } from "@/errors";

/**
 * The only place in the frontend that knows the Python API exists.
 *
 * Nothing else calls `fetch` against the backend: base URL, timeout, error
 * envelope parsing and response validation all live here, so swapping the
 * backend or adding retries stays a one-file change.
 */

const DEFAULT_TIMEOUT_MS = 8000;

const UNAVAILABLE_MESSAGE = "Сервер тимчасово недоступний. Спробуйте оновити сторінку за хвилину";

/** Shape every endpoint uses to report a failure (contract §5.3). */
const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().catch(""),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ApiRequestOptions = {
  /** Caching directives passed straight to the Next fetch layer */
  next?: { tags?: string[]; revalidate?: number | false };
  timeoutMs?: number;
};

const getBaseUrl = (): string | null => {
  const configured = process.env.MENU_API_URL?.trim();
  if (!configured) return null;

  return configured.replace(/\/+$/, "");
};

const readJson = async (response: Response, url: string): Promise<unknown> => {
  try {
    return await response.json();
  } catch (cause) {
    console.error(`[api] ${url} → ${response.status}: body is not valid JSON`, cause);
    return null;
  }
};

/**
 * Maps `{ error: { code, message } }` onto the class hierarchy. A response
 * that does not carry the envelope means the backend is not speaking the
 * contract — for the visitor that is indistinguishable from being down.
 */
const toTypedError = (payload: unknown, status: number, url: string): AppError => {
  const envelope = errorEnvelopeSchema.safeParse(payload);

  if (!envelope.success) {
    console.error(`[api] ${url} → ${status} without a readable error envelope`);
    return new ApiUnavailableError(UNAVAILABLE_MESSAGE, { status, url });
  }

  const { code, message, fields } = envelope.data.error;
  console.error(`[api] ${url} → ${status} ${code}: ${message}`);

  return fromErrorCode(code, message, fields);
};

export const apiRequest = async <T>(
  path: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    console.error("[api] MENU_API_URL is not configured");
    throw new ApiUnavailableError(UNAVAILABLE_MESSAGE);
  }

  const url = `${baseUrl}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      next: options.next,
    });
  } catch (cause) {
    console.error(`[api] ${url} did not answer`, cause);
    throw new ApiUnavailableError(UNAVAILABLE_MESSAGE, cause);
  }

  const payload = await readJson(response, url);

  if (!response.ok) {
    throw toTypedError(payload, response.status, url);
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    console.error(`[api] ${url} returned an unexpected shape`, parsed.error.issues);
    throw new ApiUnavailableError(UNAVAILABLE_MESSAGE, parsed.error.issues);
  }

  return parsed.data;
};
