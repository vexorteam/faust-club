"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"

import { Field } from "@/components/ui/Field"
import { atmosphereFormSchema, PHOTO_ALT_MAX, PHOTO_LABEL_MAX } from "@/schemas/atmosphere"
import { describeUploadProblem } from "@/schemas/image"
import styles from "./AtmosphereForm.module.css"
import { ImageInput } from "./ImageInput"
import { useAdminMutation } from "./useAdminMutation"

/**
 * A new tile of the "Атмосфера" grid.
 *
 * Everything goes out in one multipart request, the photo included: the API
 * creates a tile only with a picture, so there is no half-made state to leave
 * behind if the upload fails.
 */

type FieldErrors = { label?: string; imageAlt?: string }

export const AtmosphereCreateForm = () => {
  const router = useRouter()
  const { mutate, pendingKey } = useAdminMutation()
  const [label, setLabel] = useState("")
  const [imageAlt, setImageAlt] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [photoError, setPhotoError] = useState<string | undefined>(undefined)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = atmosphereFormSchema.safeParse({ label, imageAlt, visible: true })
    const collected: FieldErrors = {}

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]

        if (field === "label" && !collected.label) collected.label = issue.message
        if (field === "imageAlt" && !collected.imageAlt) collected.imageAlt = issue.message
      }
    }

    const fileProblem = describeUploadProblem(file)

    setErrors(collected)
    setPhotoError(fileProblem ?? undefined)

    if (!parsed.success || !file) return

    const body = new FormData()

    body.set("file", file)
    body.set("label", parsed.data.label)
    body.set("alt", parsed.data.imageAlt)

    const outcome = await mutate(
      "save",
      { url: "/api/admin/atmosphere", method: "POST", body },
      { success: "Плитку додано", refresh: false }
    )

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors)
      return
    }

    router.push("/admin/atmosphere")
    router.refresh()
  }

  const saving = pendingKey === "save"

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
    >
      <ImageInput
        file={file}
        onSelect={chosen => {
          setFile(chosen)
          setPhotoError(undefined)
        }}
        error={photoError}
        disabled={saving}
        hint='Знімок із телефона підійде як є. JPEG, PNG, WebP або HEIC, до 5 МБ.'
      />

      <Field
        label='Підпис на плитці'
        required
        maxLength={PHOTO_LABEL_MAX}
        placeholder='Танцпол'
        value={label}
        error={errors.label}
        onChange={event => setLabel(event.target.value)}
      />

      <p className={styles.hint}>Коротке слово, яке гість читає поверх фото.</p>

      <Field
        as='textarea'
        label='Опис для скрінрідера'
        required
        maxLength={PHOTO_ALT_MAX}
        placeholder='Танцпол Faust під час нічного сету'
        value={imageAlt}
        error={errors.imageAlt}
        onChange={event => setImageAlt(event.target.value)}
      />

      <p className={styles.hint}>
        Те, що прочитають замість картинки — тому не дублюйте підпис, а опишіть, що саме на знімку.
      </p>

      <div className={styles.actions}>
        <button
          type='submit'
          className={styles.submit}
          disabled={saving}
        >
          {saving ? "Завантажуємо…" : "Додати плитку"}
        </button>

        <Link
          href='/admin/atmosphere'
          className={styles.cancel}
        >
          Скасувати
        </Link>
      </div>
    </form>
  )
}
