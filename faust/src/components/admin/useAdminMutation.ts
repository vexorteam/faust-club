"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

import { useToast } from "./Toast"

const NETWORK_MESSAGE = "Не вдалося зʼєднатися з сервером. Зміни не збережені — спробуйте ще раз"

const FALLBACK_MESSAGE = "Щось пішло не так. Спробуйте ще раз"

export type MutationRequest = {
  url: string
  method: "POST" | "PATCH" | "DELETE"
  /** `FormData` goes out as multipart — that is how a photo travels */
  body?: unknown
}

export type MutationOptions = {
  /** Toast text on success. Past tense: «Збережено», «Позицію видалено» */
  success?: string
  /** Off for forms that navigate away and refresh at the destination */
  refresh?: boolean
}

export type MutationFailure = { ok: false; code: string; message: string; fieldErrors?: Record<string, string> }

/** `data` is what the route handler answered — an id, so a follow-up call can use it */
export type MutationOutcome = { ok: true; data: unknown } | MutationFailure

type FailurePayload = { message?: unknown; code?: unknown; fieldErrors?: unknown }

const isRecordOfStrings = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(entry => typeof entry === "string")

const readFailure = (payload: unknown): MutationFailure => {
  const failure: FailurePayload = typeof payload === "object" && payload !== null ? payload : {}
  const message = typeof failure.message === "string" ? failure.message : FALLBACK_MESSAGE
  const code = typeof failure.code === "string" ? failure.code : "UNKNOWN"

  return isRecordOfStrings(failure.fieldErrors)
    ? { ok: false, code, message, fieldErrors: failure.fieldErrors }
    : { ok: false, code, message }
}

export const useAdminMutation = () => {
  const router = useRouter()
  const { show } = useToast()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const mutate = useCallback(
    async (key: string, request: MutationRequest, options: MutationOptions = {}): Promise<MutationOutcome> => {
      setPendingKey(key)

      /** The browser writes the multipart boundary itself; setting a type breaks it */
      const isMultipart = request.body instanceof FormData

      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.body === undefined || isMultipart ? undefined : { "content-type": "application/json" },
          body:
            request.body === undefined || isMultipart
              ? (request.body as BodyInit | undefined)
              : JSON.stringify(request.body),
        })
        const payload: unknown = await response.json().catch(() => null)

        if (!response.ok) {
          const failure = readFailure(payload)
          show(failure.message, "error")

          return failure
        }

        if (options.success) show(options.success)
        if (options.refresh !== false) router.refresh()

        const data = typeof payload === "object" && payload !== null ? (payload as { data?: unknown }).data : null

        return { ok: true, data: data ?? null }
      } catch (error) {
        console.error(`[admin] ${request.method} ${request.url} failed`, error)
        show(NETWORK_MESSAGE, "error")

        return { ok: false, code: "NETWORK", message: NETWORK_MESSAGE }
      } finally {
        setPendingKey(null)
      }
    },
    [router, show]
  )

  return { mutate, pendingKey }
}
