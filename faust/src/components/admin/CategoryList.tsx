import type { AdminCategory } from "@/schemas/category";
import { CategoryCreateForm } from "./CategoryCreateForm";
import { CategoryRow } from "./CategoryRow";
import styles from "./CategoryList.module.css";

/**
 * Categories in the order they appear on the showcase.
 *
 * The API sorts them, so the array is rendered as it arrives — position in the
 * list is position on the page, and that is the only place the order is stored.
 */

export type CategoryListProps = { categories: readonly AdminCategory[] };

export const CategoryList = ({ categories }: CategoryListProps) => (
  <div className={styles.board}>
    <CategoryCreateForm />

    {categories.length === 0 ? (
      <p className={styles.empty}>Категорій ще немає. Створіть першу — і в неї можна буде додавати позиції.</p>
    ) : (
      <ul className={styles.list}>
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
          />
        ))}
      </ul>
    )}
  </div>
);
