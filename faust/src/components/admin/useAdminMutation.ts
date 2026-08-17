"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "./Toast";

/**
 * Every write the admin UI performs, in one shape.
 *
 * The cookie is httpOnly, so nothing here talks to the Python API directly:
 * requests go to this application's own route handlers, which attach the token
 * server-side. On success the page is refreshed so the list shows what the
 * database now holds instead of what the browser guessed.
 *
 * `pendingKey` is the id of the row or form currently waiting, which is what
 * lets a single hook disable exactly one button instead of all of them.
 */

const NETWORK_MESSAGE = "Не вдалося зʼєднатися з сервером. Зміни не збережені — спробуйте ще раз";

const FALLBACK_MESSAGE = "Щось пішло не так. Спробуйте ще раз";

export type MutationRequest = {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type MutationOptions = {
  /** Toast text on success. Past tense: «Збережено», «Позицію видалено» */
  success?: string;
  /** Off for forms that navigate away and refresh at the destination */
  refresh?: boolean;
};

export type MutationFailure = { ok: false; code: string; message: string; fieldErrors?: Record<string, string> };

export type MutationOutcome = { ok: true } | MutationFailure;

type FailurePayload = { message?: unknown; code?: unknown; fieldErrors?: unknown };

const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "string");

const readFailure = (payload: unknown): MutationFailure => {
  const failure: FailurePayload = typeof payload === "object" && payload !== null ? payload : {};
  const message = typeof failure.message === "string" ? failure.message : FALLBACK_MESSAGE;
  const code = typeof failure.code === "string" ? failure.code : "UNKNOWN";

  return isRecordOfStrings(failure.fieldErrors)
    ? { ok: false, code, message, fieldErrors: failure.fieldErrors }
    : { ok: false, code, message };
};

export const useAdminMutation = () => {
  const router = useRouter();
  const { show } = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const mutate = useCallback(
    async (key: string, request: MutationRequest, options: MutationOptions = {}): Promise<MutationOutcome> => {
      setPendingKey(key);

      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.body === undefined ? undefined : { "content-type": "application/json" },
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const failure = readFailure(payload);
          show(failure.message, "error");

          return failure;
        }

        if (options.success) show(options.success);
        if (options.refresh !== false) router.refresh();

        return { ok: true };
      } catch (error) {
        console.error(`[admin] ${request.method} ${request.url} failed`, error);
        show(NETWORK_MESSAGE, "error");

        return { ok: false, code: "NETWORK", message: NETWORK_MESSAGE };
      } finally {
        setPendingKey(null);
      }
    },
    [router, show],
  );

  return { mutate, pendingKey };
};
