import { useId, type InputHTMLAttributes } from "react";
import styles from "./CheckboxField.module.css";

/**
 * A checkbox with a label big enough to hit with a thumb: the whole row is the
 * target, not just the 16px box.
 */

export type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
};

export const CheckboxField = ({ label, hint, id: providedId, ...rest }: CheckboxFieldProps) => {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.row}>
        <input id={id} type="checkbox" className={styles.box} aria-describedby={hintId} {...rest} />
        <span className={styles.text}>{label}</span>
      </label>

      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
};
