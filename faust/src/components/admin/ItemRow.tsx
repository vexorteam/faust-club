"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { AdminMenuItem } from "@/schemas/menu-item";
import type { MoveDirection } from "@/schemas/category";
import { MoveButtons } from "./MoveButtons";
import { StateToggle } from "./StateToggle";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./ItemRow.module.css";

/**
 * One line of the menu list.
 *
 * Everything that gets changed weekly happens here without opening a form: the
 * availability switch and the order arrows save on press. Editing the price
 * still needs the form, which keeps the path «сайт → зміна ціни» at four
 * interactions (§6.3).
 */

const BADGE_LABELS: Record<"new" | "hit", string> = { new: "Нове", hit: "Хіт" };

export type ItemRowProps = {
  item: AdminMenuItem;
  isFirst: boolean;
  isLast: boolean;
};

export const ItemRow = ({ item, isFirst, isLast }: ItemRowProps) => {
  const { mutate, pendingKey } = useAdminMutation();

  const setAvailable = (next: boolean) =>
    void mutate(
      "available",
      { url: `/api/admin/items/${item.id}`, method: "PATCH", body: { available: next } },
      { success: next ? `«${item.name}» знову в продажу` : `«${item.name}» знято з продажу` },
    );

  const move = (direction: MoveDirection) =>
    void mutate(
      "move",
      { url: `/api/admin/items/${item.id}/move`, method: "POST", body: { direction } },
      { success: "Порядок оновлено" },
    );

  return (
    <li className={item.available ? styles.row : `${styles.row} ${styles.unavailable}`}>
      <div className={styles.identity}>
        <span className={styles.name}>
          {item.name}
          {item.badge && <span className={styles.badge}>{BADGE_LABELS[item.badge]}</span>}
        </span>

        {item.volume && <span className={styles.volume}>{item.volume}</span>}
      </div>

      <span className={styles.price}>{formatPrice(item.price)}</span>

      <div className={styles.controls}>
        <StateToggle
          on={item.available}
          onLabel="Є"
          offLabel="Немає"
          title={item.available ? `«${item.name}» є в наявності` : `«${item.name}» немає`}
          pending={pendingKey === "available"}
          onToggle={setAvailable}
        />

        <MoveButtons what={item.name} isFirst={isFirst} isLast={isLast} pending={pendingKey === "move"} onMove={move} />

        <Link href={`/admin/items/${item.id}`} className={styles.edit}>
          Редагувати
        </Link>
      </div>
    </li>
  );
};
