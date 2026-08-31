import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import type { SessionRenewal } from "@/lib/api"
import type { AdminUser } from "@/types"

import { ForbiddenError, UnauthorizedError } from "@/errors"
import { apiRequest } from "@/lib/api"
import { SESSION_COOKIE } from "@/lib/session-cookie"
import { meResponseSchema } from "@/schemas/auth"

export { SESSION_COOKIE }

const EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз"

export const ADMIN_LOGIN_PATH = "/admin/login"
export const ADMIN_HOME_PATH = "/admin"

/** Reads the raw token. Server-only: the cookie is invisible to client JS. */
export const readSessionToken = async (): Promise<string | null> => {
  const store = await cookies()

  return store.get(SESSION_COOKIE)?.value ?? null
}

/** Route handlers only — Server Components are not allowed to write cookies. */
export const setSessionCookie = async (token: string, maxAgeSeconds: number): Promise<void> => {
  const store = await cookies()

  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.SESSION_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  })
}

export const applySessionRenewal = async (renewal: SessionRenewal | null): Promise<boolean> => {
  if (!renewal) return false

  try {
    await setSessionCookie(renewal.token, renewal.expiresIn)

    return true
  } catch {
    return false
  }
}

export const clearSessionCookie = async (): Promise<void> => {
  const store = await cookies()

  store.delete(SESSION_COOKIE)
}

export const getSession = cache(async (): Promise<AdminUser | null> => {
  const token = await readSessionToken()

  if (!token) return null

  try {
    const { user } = await apiRequest("/api/v1/auth/me", meResponseSchema, {
      token,
      cache: "no-store",
    })

    return user
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return null
    }

    throw error
  }
})

/**
 * Guard for every admin route. Throws instead of returning `null`, so a
 * forgotten check cannot silently render a page to a stranger.
 */
export const requireAdmin = async (): Promise<AdminUser> => {
  const user = await getSession()

  if (!user) throw new UnauthorizedError(EXPIRED_MESSAGE)

  return user
}

export const requireAdminOrRedirect = async (): Promise<AdminUser> => {
  let user: AdminUser | null = null

  try {
    user = await requireAdmin()
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error
  }

  if (!user) redirect(ADMIN_LOGIN_PATH)

  return user
}

export const redirectIfSignedIn = async (): Promise<void> => {
  let user: AdminUser | null = null

  try {
    user = await getSession()
  } catch {
    return
  }

  // Outside the `try`: `redirect()` works by throwing, and catching it here
  // would swallow the redirect itself.
  if (user) redirect(ADMIN_HOME_PATH)
}
