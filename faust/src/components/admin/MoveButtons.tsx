"use client";

import type { MoveDirection } from "@/schemas/category";
import styles from "./MoveButtons.module.css";

/**
 * Reordering, the whole feature: two arrows, saved immediately.
 *
 * Deliberately not drag-and-drop — a bartender reorders four items on a phone
 * once a month, and that is not worth a library or a touch-drag surface.
 */

export type MoveButtonsProps = {
  /** Name of the thing being moved, for the button's accessible label */
  what: string;
  isFirst: boolean;
  isLast: boolean;
  pending?: boolean;
  onMove: (direction: MoveDirection) => void;
};

export const MoveButtons = ({ what, isFirst, isLast, pending, onMove }: MoveButtonsProps) => (
  <div className={styles.group}>
    <button
      type="button"
      className={styles.button}
      aria-label={`Підняти «${what}» вище`}
      disabled={isFirst || pending}
      onClick={() => onMove("up")}
    >
      ↑
    </button>

    <button
      type="button"
      className={styles.button}
      aria-label={`Опустити «${what}» нижче`}
      disabled={isLast || pending}
      onClick={() => onMove("down")}
    >
      ↓
    </button>
  </div>
);
