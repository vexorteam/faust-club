"use client"

import Image from "next/image"
import Link from "next/link"
import type { AtmospherePhoto } from "@/schemas/atmosphere"
import type { MoveDirection } from "@/schemas/category"

import styles from "./AtmosphereTile.module.css"
import { ConfirmAction } from "./ConfirmAction"
import { MoveButtons } from "./MoveButtons"
import { StateToggle } from "./StateToggle"
import { useAdminMutation } from "./useAdminMutation"

/**
 * One tile of the "Атмосфера" grid on the home page.
 *
 * The preview is deliberately small: this page is about which photos are shown
 * and in what order, not about admiring them.
 */

export type AtmosphereTileProps = {
  photo: AtmospherePhoto
  isFirst: boolean
  isLast: boolean
}

export const AtmosphereTile = ({ photo, isFirst, isLast }: AtmosphereTileProps) => {
  const { mutate, pendingKey } = useAdminMutation()

  const setVisible = (next: boolean) =>
    void mutate(
      "visible",
      { url: `/api/admin/atmosphere/${photo.id}`, method: "PATCH", body: { visible: next } },
      { success: next ? `«${photo.label}» знову на головній` : `«${photo.label}» прихована` }
    )

  const move = (direction: MoveDirection) =>
    void mutate(
      "move",
      { url: `/api/admin/atmosphere/${photo.id}/move`, method: "POST", body: { direction } },
      { success: "Порядок оновлено" }
    )

  const remove = () =>
    void mutate(
      "delete",
      { url: `/api/admin/atmosphere/${photo.id}`, method: "DELETE" },
      { success: `«${photo.label}» видалено` }
    )

  return (
    <li className={photo.visible ? styles.tile : `${styles.tile} ${styles.hidden}`}>
      <Image
        src={photo.image}
        alt={photo.imageAlt}
        width={320}
        height={240}
        className={styles.preview}
      />

      <div className={styles.body}>
        <span className={styles.label}>{photo.label}</span>
        <span className={styles.alt}>{photo.imageAlt}</span>
      </div>

      <div className={styles.controls}>
        <StateToggle
          on={photo.visible}
          onLabel='Видно'
          offLabel='Прихована'
          title={photo.visible ? `«${photo.label}» видно на головній` : `«${photo.label}» прихована`}
          pending={pendingKey === "visible"}
          onToggle={setVisible}
        />

        <MoveButtons
          what={photo.label}
          isFirst={isFirst}
          isLast={isLast}
          pending={pendingKey === "move"}
          onMove={move}
        />

        <Link
          href={`/admin/atmosphere/${photo.id}`}
          className={styles.edit}
        >
          Редагувати
        </Link>

        <ConfirmAction
          label='Видалити'
          question={`Видалити «${photo.label}»? Скасувати неможливо`}
          pending={pendingKey === "delete"}
          onConfirm={remove}
        />
      </div>
    </li>
  )
}
