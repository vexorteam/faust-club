"use client"

import { useState } from "react"

import styles from "./ConfirmAction.module.css"

/**
 * Deletion, in two presses.
 *
 * The question is asked in place and names what is about to disappear —
 * «Видалити "Негроні"? Скасувати неможливо» — because a browser `confirm()`
 * cannot say which row it means, and a modal is more machinery than one
 * sentence deserves.
 */

export type ConfirmActionProps = {
  /** Text of the resting button: «Видалити» */
  label: string
  question: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
}

export const ConfirmAction = ({
  label,
  question,
  confirmLabel = "Так, видалити",
  pending,
  onConfirm,
}: ConfirmActionProps) => {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button
        type='button'
        className={styles.trigger}
        disabled={pending}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className={styles.confirm}
      role='group'
      aria-label={question}
    >
      <p className={styles.question}>{question}</p>

      <div className={styles.actions}>
        <button
          type='button'
          className={styles.danger}
          autoFocus
          disabled={pending}
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          {pending ? "Видаляємо…" : confirmLabel}
        </button>

        <button
          type='button'
          className={styles.cancel}
          disabled={pending}
          onClick={() => setAsking(false)}
        >
          Скасувати
        </button>
      </div>
    </div>
  )
}
