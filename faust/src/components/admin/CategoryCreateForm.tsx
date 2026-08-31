"use client"

import { useState } from "react"
import type { FormEvent } from "react"

import { Field } from "@/components/ui/Field"
import { slugify } from "@/lib/slug"
import { CATEGORY_LABEL_MAX, CATEGORY_NOTE_MAX, CATEGORY_SLUG_MAX, categoryFormSchema } from "@/schemas/category"
import styles from "./CategoryCreateForm.module.css"
import { useAdminMutation } from "./useAdminMutation"

/**
 * Adding a category.
 *
 * The address is generated from the title — «Авторські коктейлі» becomes
 * `avtorski-koktaili` — and stays editable, because it ends up in a link people
 * paste around. Once the owner touches the field, typing in the title no longer
 * overwrites what they wrote.
 */

type FieldErrors = { label?: string; slug?: string; note?: string }

export const CategoryCreateForm = () => {
  const { mutate, pendingKey } = useAdminMutation()
  const [label, setLabel] = useState("")
  const [slug, setSlug] = useState("")
  const [note, setNote] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const onLabelChange = (value: string) => {
    setLabel(value)

    if (!slugTouched) setSlug(slugify(value))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = categoryFormSchema.safeParse({ label, slug, note, visible: true })

    if (!parsed.success) {
      const collected: FieldErrors = {}

      for (const issue of parsed.error.issues) {
        const field = issue.path[0]

        if (field === "label" && !collected.label) collected.label = issue.message
        if (field === "slug" && !collected.slug) collected.slug = issue.message
        if (field === "note" && !collected.note) collected.note = issue.message
      }

      setErrors(collected)
      return
    }

    setErrors({})

    const outcome = await mutate(
      "create",
      { url: "/api/admin/categories", method: "POST", body: parsed.data },
      { success: "Категорію додано" }
    )

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors)
      return
    }

    setLabel("")
    setSlug("")
    setNote("")
    setSlugTouched(false)
  }

  const pending = pendingKey === "create"

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
    >
      <h2 className={styles.title}>Нова категорія</h2>

      <div className={styles.pair}>
        <Field
          label='Назва'
          name='label'
          required
          maxLength={CATEGORY_LABEL_MAX}
          placeholder='Авторські коктейлі'
          value={label}
          error={errors.label}
          onChange={event => onLabelChange(event.target.value)}
        />

        <Field
          label='Адреса'
          name='slug'
          required
          maxLength={CATEGORY_SLUG_MAX}
          placeholder='signature'
          value={slug}
          error={errors.slug}
          onChange={event => {
            setSlugTouched(true)
            setSlug(event.target.value)
          }}
        />
      </div>

      <Field
        label='Підпис'
        name='note'
        maxLength={CATEGORY_NOTE_MAX}
        placeholder='подаються з 22:00'
        value={note}
        error={errors.note}
        onChange={event => setNote(event.target.value)}
      />

      <button
        type='submit'
        className={styles.submit}
        disabled={pending}
      >
        {pending ? "Додаємо…" : "Додати категорію"}
      </button>
    </form>
  )
}
