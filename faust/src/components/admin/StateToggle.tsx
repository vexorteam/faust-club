"use client"

import styles from "./StateToggle.module.css"

/**
 * A two-state switch that saves itself: item availability in the list, category
 * and photo visibility everywhere else. One press, one request, no form around
 * it — running out of Negroni behind the bar should not require opening an
 * edit page.
 *
 * `aria-pressed` carries the state, so a screen reader announces the switch
 * rather than reading the caption twice.
 */

export type StateToggleProps = {
  on: boolean
  onLabel: string
  offLabel: string
  /** Full sentence for assistive tech: «Позиція "Негроні" — є в наявності» */
  title: string
  pending?: boolean
  disabled?: boolean
  onToggle: (next: boolean) => void
}

export const StateToggle = ({ on, onLabel, offLabel, title, pending, disabled, onToggle }: StateToggleProps) => (
  <button
    type='button'
    className={[styles.toggle, on ? styles.on : styles.off].join(" ")}
    aria-pressed={on}
    aria-label={title}
    title={title}
    disabled={disabled || pending}
    onClick={() => onToggle(!on)}
  >
    {pending ? "…" : on ? onLabel : offLabel}
  </button>
)
