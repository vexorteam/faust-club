"use client"

import { useState } from "react"
import type { MoveDirection } from "@/schemas/category"
import type { AdminTestimonial } from "@/schemas/testimonial"

import { Field } from "@/components/ui/Field"
import {
  TESTIMONIAL_META_MAX,
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_TEXT_MAX,
  testimonialFormSchema,
} from "@/schemas/testimonial"
import { ConfirmAction } from "./ConfirmAction"
import { MoveButtons } from "./MoveButtons"
import { StateToggle } from "./StateToggle"
import styles from "./TestimonialRow.module.css"
import { useAdminMutation } from "./useAdminMutation"

export type TestimonialRowProps = {
  testimonial: AdminTestimonial
  isFirst: boolean
  isLast: boolean
}

type FieldErrors = { text?: string; name?: string; meta?: string }

export const TestimonialRow = ({ testimonial, isFirst, isLast }: TestimonialRowProps) => {
  const { mutate, pendingKey } = useAdminMutation()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(testimonial.text)
  const [name, setName] = useState(testimonial.name)
  const [meta, setMeta] = useState(testimonial.meta)
  const [errors, setErrors] = useState<FieldErrors>({})

  const startEditing = () => {
    setText(testimonial.text)
    setName(testimonial.name)
    setMeta(testimonial.meta)
    setErrors({})
    setEditing(true)
  }

  const save = async () => {
    const parsed = testimonialFormSchema.safeParse({ text, name, meta, visible: testimonial.visible })

    if (!parsed.success) {
      const collected: FieldErrors = {}

      for (const issue of parsed.error.issues) {
        const field = issue.path[0]

        if (field === "text" && !collected.text) collected.text = issue.message
        if (field === "name" && !collected.name) collected.name = issue.message
        if (field === "meta" && !collected.meta) collected.meta = issue.message
      }

      setErrors(collected)
      return
    }

    setErrors({})

    const outcome = await mutate(
      "save",
      {
        url: `/api/admin/testimonials/${testimonial.id}`,
        method: "PATCH",
        body: { text: parsed.data.text, name: parsed.data.name, meta: parsed.data.meta },
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
      { url: `/api/admin/testimonials/${testimonial.id}`, method: "PATCH", body: { visible: next } },
      { success: next ? "Відгук знову на сайті" : "Відгук прихований" }
    )

  const move = (direction: MoveDirection) =>
    void mutate(
      "move",
      { url: `/api/admin/testimonials/${testimonial.id}/move`, method: "POST", body: { direction } },
      { success: "Порядок оновлено" }
    )

  const remove = () =>
    void mutate(
      "delete",
      { url: `/api/admin/testimonials/${testimonial.id}`, method: "DELETE" },
      { success: "Відгук видалено" }
    )

  if (editing) {
    return (
      <li className={styles.row}>
        <div className={styles.editor}>
          <Field
            as='textarea'
            label='Текст відгуку'
            required
            rows={3}
            maxLength={TESTIMONIAL_TEXT_MAX}
            value={text}
            error={errors.text}
            onChange={event => setText(event.target.value)}
          />

          <Field
            label="Ім'я"
            required
            maxLength={TESTIMONIAL_NAME_MAX}
            value={name}
            error={errors.name}
            onChange={event => setName(event.target.value)}
          />

          <Field
            label='Підпис'
            required
            maxLength={TESTIMONIAL_META_MAX}
            value={meta}
            error={errors.meta}
            onChange={event => setMeta(event.target.value)}
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
        <span className={styles.label}>{testimonial.text}</span>
        <span className={styles.meta}>
          {testimonial.name} · {testimonial.meta}
        </span>
      </div>

      <div className={styles.controls}>
        <StateToggle
          on={testimonial.visible}
          onLabel='Видно'
          offLabel='Прихований'
          title={testimonial.visible ? "Відгук видно на сайті" : "Відгук прихований"}
          pending={pendingKey === "visible"}
          onToggle={setVisible}
        />

        <MoveButtons
          what={testimonial.name}
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
          Редагувати
        </button>

        <ConfirmAction
          label='Видалити'
          question={`Видалити відгук «${testimonial.name}»? Скасувати неможливо`}
          pending={pendingKey === "delete"}
          onConfirm={remove}
        />
      </div>
    </li>
  )
}
