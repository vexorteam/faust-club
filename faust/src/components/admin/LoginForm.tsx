"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"

import { Field } from "@/components/ui/Field"
import { loginSchema } from "@/schemas/auth"
import styles from "./LoginForm.module.css"

/**
 * The form knows how credentials should *look*, never whether they are right.
 * Field errors come from Zod; the one-line error above the button comes from
 * the server and says the same thing for a wrong password and for an unknown
 * address alike.
 */

const FALLBACK_MESSAGE = "Не вдалося зʼєднатися з сервером. Спробуйте ще раз"

type FieldErrors = { email?: string; password?: string }

const collectFieldErrors = (issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors => {
  const errors: FieldErrors = {}

  for (const issue of issues) {
    const field = issue.path[0]

    if (field === "email" && !errors.email) errors.email = issue.message
    if (field === "password" && !errors.password) errors.password = issue.message
  }

  return errors
}

export const LoginForm = () => {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    const credentials = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
    })

    if (!credentials.success) {
      setFormError(null)
      setFieldErrors(collectFieldErrors(credentials.error.issues))
      return
    }

    setFieldErrors({})
    setFormError(null)
    setPending(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credentials.data),
      })
      const result: unknown = await response.json().catch(() => null)

      if (response.ok) {
        router.replace("/admin")
        router.refresh()
        return
      }

      const message =
        typeof result === "object" && result !== null && typeof (result as { message?: unknown }).message === "string"
          ? (result as { message: string }).message
          : FALLBACK_MESSAGE

      setFormError(message)
    } catch {
      setFormError(FALLBACK_MESSAGE)
    }

    setPending(false)
  }

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
    >
      <Field
        label='Пошта'
        name='email'
        type='email'
        autoComplete='username'
        inputMode='email'
        autoFocus
        required
        error={fieldErrors.email}
      />

      <Field
        label='Пароль'
        name='password'
        type='password'
        autoComplete='current-password'
        required
        error={fieldErrors.password}
      />

      {formError && (
        <p
          className={styles.formError}
          role='alert'
        >
          {formError}
        </p>
      )}

      <button
        type='submit'
        className={styles.submit}
        disabled={pending}
      >
        {pending ? "Заходимо…" : "Увійти"}
      </button>
    </form>
  )
}
