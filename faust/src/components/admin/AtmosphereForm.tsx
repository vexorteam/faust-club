"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { AtmospherePhoto } from "@/schemas/atmosphere"
import type { FormEvent } from "react"

import { Field } from "@/components/ui/Field"
import { atmosphereFormSchema, PHOTO_ALT_MAX, PHOTO_LABEL_MAX } from "@/schemas/atmosphere"
import styles from "./AtmosphereForm.module.css"
import { CheckboxField } from "./CheckboxField"
import { ImageInput } from "./ImageInput"
import { useAdminMutation } from "./useAdminMutation"

/**
 * Texts of one atmosphere tile, and the picture behind them.
 *
 * Two fields that look similar and are not: the caption is read by whoever
 * looks at the photo, the description is read *instead* of the photo. The hints
 * spell that out, because the natural instinct is to type the same thing twice.
 *
 * Replacing the picture is its own request and happens on its own button: the
 * texts are a `PATCH`, the photo is a multipart upload, and pretending they are
 * one save would mean a failed upload silently rolling back a fixed typo.
 */

type FieldErrors = { label?: string; imageAlt?: string }

export const AtmosphereForm = ({ photo }: { photo: AtmospherePhoto }) => {
  const router = useRouter()
  const { mutate, pendingKey } = useAdminMutation()
  const [label, setLabel] = useState(photo.label)
  const [imageAlt, setImageAlt] = useState(photo.imageAlt)
  const [visible, setVisible] = useState(photo.visible)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [file, setFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | undefined>(undefined)

  /**
   * The upload endpoint takes the description along with the file, so a new
   * picture always arrives described — with whatever is in the field right now.
   */
  const uploadPhoto = async () => {
    if (!file) return

    const parsed = atmosphereFormSchema.shape.imageAlt.safeParse(imageAlt)

    if (!parsed.success) {
      setErrors(current => ({ ...current, imageAlt: parsed.error.issues[0]?.message }))
      setPhotoError("Спершу опишіть, що на новому знімку")
      return
    }

    const body = new FormData()

    body.set("file", file)
    body.set("alt", parsed.data)

    const outcome = await mutate(
      "photo",
      { url: `/api/admin/atmosphere/${photo.id}/image`, method: "POST", body },
      { success: "Фото замінено" }
    )

    if (outcome.ok) {
      setFile(null)
      setPhotoError(undefined)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = atmosphereFormSchema.safeParse({ label, imageAlt, visible })

    if (!parsed.success) {
      const collected: FieldErrors = {}

      for (const issue of parsed.error.issues) {
        const field = issue.path[0]

        if (field === "label" && !collected.label) collected.label = issue.message
        if (field === "imageAlt" && !collected.imageAlt) collected.imageAlt = issue.message
      }

      setErrors(collected)
      return
    }

    setErrors({})

    const outcome = await mutate(
      "save",
      { url: `/api/admin/atmosphere/${photo.id}`, method: "PATCH", body: parsed.data },
      { success: "Збережено", refresh: false }
    )

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors)
      return
    }

    router.push("/admin/atmosphere")
    router.refresh()
  }

  const saving = pendingKey === "save"
  const uploading = pendingKey === "photo"

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
    >
      <ImageInput
        image={photo.image}
        imageAlt={photo.imageAlt}
        file={file}
        onSelect={chosen => {
          setFile(chosen)
          setPhotoError(undefined)
        }}
        onUpload={() => void uploadPhoto()}
        uploading={uploading}
        error={photoError}
        disabled={saving}
        hint='Новий знімок замінює старий одразу, окремою кнопкою. Опис нижче поїде разом із ним.'
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

      <CheckboxField
        label='Показувати на головній'
        checked={visible}
        onChange={event => setVisible(event.target.checked)}
      />

      <div className={styles.actions}>
        <button
          type='submit'
          className={styles.submit}
          disabled={saving || uploading}
        >
          {saving ? "Зберігаємо…" : "Зберегти"}
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
