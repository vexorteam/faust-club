import type { AtmospherePhoto } from "@/schemas/atmosphere"

import { AdminNotice } from "./AdminNotice"
import styles from "./AtmosphereBoard.module.css"
import { AtmosphereTile } from "./AtmosphereTile"

/**
 * The grid the home page mirrors. Order here is order there — and an empty list
 * here means the section simply does not appear on the home page.
 */

export type AtmosphereBoardProps = { photos: readonly AtmospherePhoto[] }

export const AtmosphereBoard = ({ photos }: AtmosphereBoardProps) => {
  if (photos.length === 0) {
    return (
      <AdminNotice action={{ href: "/admin/atmosphere/new", label: "Додати фото" }}>
        Фотографій ще немає, тому секції «Атмосфера» на головній не видно. Перше ж фото поверне її на місце.
      </AdminNotice>
    )
  }

  return (
    <ul className={styles.grid}>
      {photos.map((photo, index) => (
        <AtmosphereTile
          key={photo.id}
          photo={photo}
          isFirst={index === 0}
          isLast={index === photos.length - 1}
        />
      ))}
    </ul>
  )
}
