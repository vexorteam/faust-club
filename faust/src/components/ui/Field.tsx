import { useId } from "react"
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react"

import styles from "./Field.module.css"

type BaseFieldProps = {
  label: string
  error?: string
  required?: boolean
}

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input"
  }

type TextareaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea"
  }

export type FieldProps = InputFieldProps | TextareaFieldProps

export const Field = (props: FieldProps) => {
  const generatedId = useId()
  const { label, error, required, id = generatedId, className, ...rest } = props
  const errorId = error ? `${id}-error` : undefined
  const controlClassName = [
    styles.control,
    error && styles.invalid,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={styles.field}>
      <label
        htmlFor={id}
        className={styles.label}
      >
        {label}
        {required && (
          <span
            className={styles.required}
            aria-hidden='true'
          >
            *
          </span>
        )}
      </label>

      {props.as === "textarea" ? (
        <textarea
          id={id}
          className={controlClassName}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          className={controlClassName}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && (
        <span
          id={errorId}
          className={styles.error}
          role='alert'
        >
          {error}
        </span>
      )}
    </div>
  )
}
