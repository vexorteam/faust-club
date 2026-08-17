import { useId, type SelectHTMLAttributes } from "react";
import styles from "./SelectField.module.css";

/**
 * A labelled `<select>`, shaped like `ui/Field` so the admin forms look like
 * one form. It lives here rather than inside `Field` on purpose: `Field` is a
 * shared primitive of the public site, and the admin area has no business
 * growing variants onto it.
 */

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly SelectOption[];
  error?: string;
  hint?: string;
};

export const SelectField = ({
  label,
  options,
  error,
  hint,
  required,
  id: providedId,
  className,
  ...rest
}: SelectFieldProps) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      <select
        id={id}
        className={[styles.control, error && styles.invalid, className].filter(Boolean).join(" ")}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
