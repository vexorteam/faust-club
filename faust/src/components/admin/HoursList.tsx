"use client"

import { useState } from "react"
import type { AdminHours } from "@/schemas/settings"

import { hoursFormSchema } from "@/schemas/settings"
import styles from "./HoursList.module.css"
import { useAdminMutation } from "./useAdminMutation"

/**
 * The week's schedule: seven fixed rows, each patched in place.
 *
 * There is no add or remove here — unlike categories or socials, a weekday is
 * not a thing the owner creates. "Вихідний" is one checkbox rather than two
 * empty time fields, because the API refuses one time without the other
 * (§5.3.1) and a checkbox cannot land in that half-filled state.
 */

type RowState = { open: string; close: string; closed: boolean; closesNextDay: boolean }

const toRowState = (hours: AdminHours): RowState => ({
  open: hours.open ?? "",
  close: hours.close ?? "",
  closed: hours.open === null,
  closesNextDay: hours.closesNextDay,
})

const HoursRow = ({ hours }: { hours: AdminHours }) => {
  const { mutate, pendingKey } = useAdminMutation()
  const [row, setRow] = useState<RowState>(() => toRowState(hours))
  const [error, setError] = useState<string | undefined>()
  const [dirty, setDirty] = useState(false)

  const save = async () => {
    const payload = row.closed
      ? { open: null, close: null, closesNextDay: false }
      : { open: row.open, close: row.close, closesNextDay: row.closesNextDay }
    const parsed = hoursFormSchema.safeParse(payload)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }

    setError(undefined)

    const outcome = await mutate(
      "save",
      { url: `/api/admin/settings/hours/${hours.day}`, method: "PATCH", body: parsed.data },
      { success: `${hours.label}: збережено` }
    )

    if (outcome.ok) setDirty(false)
    else if (outcome.fieldErrors) setError(Object.values(outcome.fieldErrors)[0])
  }

  const pending = pendingKey === "save"

  return (
    <li className={styles.row}>
      <span className={styles.label}>{hours.label}</span>

      <label className={styles.closedToggle}>
        <input
          type='checkbox'
          checked={row.closed}
          onChange={event => {
            setRow(prev => ({ ...prev, closed: event.target.checked }))
            setDirty(true)
          }}
        />
        Вихідний
      </label>

      {!row.closed && (
        <div className={styles.times}>
          <input
            type='time'
            className={styles.time}
            aria-label={`${hours.label}: час відкриття`}
            value={row.open}
            onChange={event => {
              setRow(prev => ({ ...prev, open: event.target.value }))
              setDirty(true)
            }}
          />
          <span aria-hidden='true'>–</span>
          <input
            type='time'
            className={styles.time}
            aria-label={`${hours.label}: час закриття`}
            value={row.close}
            onChange={event => {
              setRow(prev => ({ ...prev, close: event.target.value }))
              setDirty(true)
            }}
          />

          <label
            className={styles.closedToggle}
            title='Час закриття належить наступній календарній добі'
          >
            <input
              type='checkbox'
              checked={row.closesNextDay}
              onChange={event => {
                setRow(prev => ({ ...prev, closesNextDay: event.target.checked }))
                setDirty(true)
              }}
            />
            Закривається після півночі
          </label>
        </div>
      )}

      {error && (
        <span
          className={styles.error}
          role='alert'
        >
          {error}
        </span>
      )}

      <button
        type='button'
        className={styles.save}
        disabled={!dirty || pending}
        onClick={() => void save()}
      >
        {pending ? "Зберігаємо…" : "Зберегти"}
      </button>
    </li>
  )
}

export const HoursList = ({ hours }: { hours: AdminHours[] }) => (
  <ul className={styles.list}>
    {hours.map(entry => (
      <HoursRow
        key={entry.id}
        hours={entry}
      />
    ))}
  </ul>
)
