import { z } from "zod"

const EMAIL_MESSAGE = "Вкажіть пошту у форматі name@example.com"
const PASSWORD_MESSAGE = "Пароль — щонайменше 8 символів"

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email(EMAIL_MESSAGE)),
  password: z.string().min(8, PASSWORD_MESSAGE),
})

export type LoginInput = z.input<typeof loginSchema>
export type LoginCredentials = z.output<typeof loginSchema>

/** Admin identity as the API describes it — no roles, no permissions yet. */
export const adminUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  email: z.email(),
})

/**
 * `POST /api/v1/auth/login`. The token is snake_case on the wire; it is
 * renamed here so nothing downstream has to know that.
 */
export const loginResponseSchema = z
  .object({
    access_token: z.string().min(1),
    expires_in: z.number().int().positive(),
    user: adminUserSchema,
  })
  .transform(({ access_token, expires_in, user }) => ({
    token: access_token,
    expiresIn: expires_in,
    user,
  }))

/** `GET /api/v1/auth/me` — the only proof that a session is still alive. */
export const meResponseSchema = z.object({ user: adminUserSchema })
