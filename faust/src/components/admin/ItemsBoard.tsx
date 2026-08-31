"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { AdminItemGroup } from "@/schemas/menu-item"

import { formatItemsCount } from "@/lib/format"
import { ItemRow } from "./ItemRow"
import styles from "./ItemsBoard.module.css"

/**
 * The whole menu on one screen, grouped the way the showcase groups it.
 *
 * Search filters locally: the entire card is a few dozen items, so asking the
 * API on every keystroke would be slower than not asking. The order arrows keep
 * looking at an item's real position even while the list is filtered — the
 * position is a property of the category, not of what is currently on screen.
 */

export type ItemsBoardProps = { groups: readonly AdminItemGroup[] }

const matches = (name: string, query: string) => name.toLowerCase().includes(query)

export const ItemsBoard = ({ groups }: ItemsBoardProps) => {
  const [query, setQuery] = useState("")
  const trimmed = query.trim().toLowerCase()

  const visibleGroups = useMemo(() => {
    if (trimmed.length === 0) return groups.map(group => ({ group, shown: group.items }))

    return groups
      .map(group => ({ group, shown: group.items.filter(item => matches(item.name, trimmed)) }))
      .filter(entry => entry.shown.length > 0)
  }, [groups, trimmed])

  const found = visibleGroups.reduce((total, entry) => total + entry.shown.length, 0)

  return (
    <div className={styles.board}>
      <div className={styles.search}>
        <label
          htmlFor='item-search'
          className='visually-hidden'
        >
          Пошук позиції за назвою
        </label>
        <input
          id='item-search'
          type='search'
          className={styles.input}
          placeholder='Пошук за назвою'
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>

      {trimmed.length > 0 && found === 0 && (
        <p className={styles.nothing}>
          За запитом «{query.trim()}» позицій немає. Перевірте назву або{" "}
          <Link
            href='/admin/items/new'
            className={styles.inlineLink}
          >
            додайте нову позицію
          </Link>
          .
        </p>
      )}

      {visibleGroups.map(({ group, shown }) => (
        <section
          key={group.id}
          className={styles.group}
        >
          <header className={styles.groupHead}>
            <h2 className={styles.groupTitle}>
              {group.label}
              {!group.visible && <span className={styles.hidden}>приховано на сайті</span>}
            </h2>
            <span className={styles.count}>{formatItemsCount(group.items.length)}</span>
          </header>

          {shown.length === 0 ? (
            <p className={styles.emptyGroup}>
              У цій категорії позицій ще немає.{" "}
              <Link
                href='/admin/items/new'
                className={styles.inlineLink}
              >
                Додайте першу
              </Link>
              .
            </p>
          ) : (
            <ul className={styles.list}>
              {shown.map(item => {
                const index = group.items.indexOf(item)

                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === group.items.length - 1}
                  />
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
