import { z } from "zod";
import { ApiUnavailableError, fromErrorCode, type AppError } from "@/errors";

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
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  /** Caching directives passed straight to the Next fetch layer */
  next?: { tags?: string[]; revalidate?: number | false };
  cache?: RequestCache;
  timeoutMs?: number;
  onRenewal?: (renewal: SessionRenewal) => void;
};

export type SessionRenewal = { token: string; expiresIn: number };

/** Headers of the sliding renewal. Absent on all but the last day of a token. */
const readRenewal = (response: Response): SessionRenewal | null => {
  const token = response.headers.get("x-session-token");
  const expiresIn = Number(response.headers.get("x-session-expires-in"));

  if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) return null;

  return { token, expiresIn };
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
  const headers: Record<string, string> = { accept: "application/json", ...options.headers };

  /** Multipart writes its own content type, boundary included — do not set one. */
  const isMultipart = options.body instanceof FormData;

  if (options.body !== undefined && !isMultipart) headers["content-type"] = "application/json";
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined || isMultipart
          ? (options.body as BodyInit | undefined)
          : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      next: options.next,
      cache: options.cache,
    });
  } catch (cause) {
    console.error(`[api] ${url} did not answer`, cause);
    throw new ApiUnavailableError(UNAVAILABLE_MESSAGE, cause);
  }

  if (options.onRenewal) {
    const renewal = readRenewal(response);

    if (renewal) options.onRenewal(renewal);
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
