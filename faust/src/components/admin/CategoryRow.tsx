"use client"

import { useState } from "react"
import type { AdminCategory, MoveDirection } from "@/schemas/category"

import { Field } from "@/components/ui/Field"
import { formatItemsCount } from "@/lib/format"
import { CATEGORY_LABEL_MAX, CATEGORY_NOTE_MAX, CATEGORY_SLUG_MAX, categoryFormSchema } from "@/schemas/category"
import styles from "./CategoryRow.module.css"
import { ConfirmAction } from "./ConfirmAction"
import { MoveButtons } from "./MoveButtons"
import { StateToggle } from "./StateToggle"
import { useAdminMutation } from "./useAdminMutation"

export type CategoryRowProps = {
  category: AdminCategory
  isFirst: boolean
  isLast: boolean
}

type FieldErrors = { label?: string; slug?: string; note?: string }

export const CategoryRow = ({ category, isFirst, isLast }: CategoryRowProps) => {
  const { mutate, pendingKey } = useAdminMutation()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(category.label)
  const [slug, setSlug] = useState(category.slug)
  const [note, setNote] = useState(category.note ?? "")
  const [errors, setErrors] = useState<FieldErrors>({})

  const startEditing = () => {
    setLabel(category.label)
    setSlug(category.slug)
    setNote(category.note ?? "")
    setErrors({})
    setEditing(true)
  }

  const save = async () => {
    const parsed = categoryFormSchema.safeParse({ label, slug, note, visible: category.visible })

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
      "save",
      {
        url: `/api/admin/categories/${category.id}`,
        method: "PATCH",
        body: { label: parsed.data.label, slug: parsed.data.slug, note: parsed.data.note },
      },
      { success: "Збережено" }
    )

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors)
      return
    }

    setEditing(false)
  }

  const setVisible = (next: boolean) =>
    void mutate(
      "visible",
      { url: `/api/admin/categories/${category.id}`, method: "PATCH", body: { visible: next } },
      { success: next ? `«${category.label}» знову на сайті` : `«${category.label}» прихована` }
    )

  const move = (direction: MoveDirection) =>
    void mutate(
      "move",
      { url: `/api/admin/categories/${category.id}/move`, method: "POST", body: { direction } },
      { success: "Порядок оновлено" }
    )

  const remove = () =>
    void mutate(
      "delete",
      { url: `/api/admin/categories/${category.id}`, method: "DELETE" },
      { success: `«${category.label}» видалено` }
    )

  if (editing) {
    return (
      <li className={styles.row}>
        <div className={styles.editor}>
          <Field
            label='Назва'
            required
            maxLength={CATEGORY_LABEL_MAX}
            value={label}
            error={errors.label}
            onChange={event => setLabel(event.target.value)}
          />

          <Field
            label='Адреса'
            required
            maxLength={CATEGORY_SLUG_MAX}
            value={slug}
            error={errors.slug}
            onChange={event => setSlug(event.target.value)}
          />

          {slug !== category.slug && (
            <p
              className={styles.warning}
              role='status'
            >
              Стара адреса «#{category.slug}» перестане працювати: збережені посилання на цю категорію зламаються.
            </p>
          )}

          <Field
            label='Підпис'
            maxLength={CATEGORY_NOTE_MAX}
            value={note}
            error={errors.note}
            onChange={event => setNote(event.target.value)}
          />

          <div className={styles.editorActions}>
            <button
              type='button'
              className={styles.save}
              disabled={pendingKey === "save"}
              onClick={() => void save()}
            >
              {pendingKey === "save" ? "Зберігаємо…" : "Зберегти"}
            </button>

            <button
              type='button'
              className={styles.action}
              onClick={() => setEditing(false)}
            >
              Скасувати
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className={styles.row}>
      <div className={styles.identity}>
        <span className={styles.label}>{category.label}</span>
        <span className={styles.meta}>
          #{category.slug} · {formatItemsCount(category.itemsCount)}
        </span>
        {category.note && <span className={styles.note}>{category.note}</span>}
      </div>

      <div className={styles.controls}>
        <StateToggle
          on={category.visible}
          onLabel='Видно'
          offLabel='Прихована'
          title={category.visible ? `«${category.label}» видно на сайті` : `«${category.label}» прихована`}
          pending={pendingKey === "visible"}
          onToggle={setVisible}
        />

        <MoveButtons
          what={category.label}
          isFirst={isFirst}
          isLast={isLast}
          pending={pendingKey === "move"}
          onMove={move}
        />

        <button
          type='button'
          className={styles.action}
          onClick={startEditing}
        >
          Перейменувати
        </button>

        <ConfirmAction
          label='Видалити'
          question={`Видалити «${category.label}»? Скасувати неможливо`}
          pending={pendingKey === "delete"}
          onConfirm={remove}
        />
      </div>
    </li>
  )
}
