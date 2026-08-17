import type { Metadata } from "next";
import { getMenu } from "@/lib/menu";
import { site } from "@/data/site";
import { MenuSections } from "@/components/menu/MenuSections";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Меню",
  description: `Барна карта ${site.name}: авторські коктейлі, класика, шоти, вино, пиво та снеки.`,
  alternates: { canonical: "/menu" },
  openGraph: {
    title: `Меню · ${site.name}`,
    description: `Барна карта ${site.name}: авторські коктейлі, класика, шоти, вино, пиво та снеки.`,
    url: "/menu",
  },
};

const MenuPage = async () => {
  const categories = await getMenu();

  return (
    <>
      <div className={`container ${styles.head}`}>
        <span className="eyebrow">Барна карта</span>
        <h1 className={styles.title}>Меню Faust</h1>
        <p className={styles.subtitle}>
          Від авторських коктейлів до класики та безалкогольних варіантів — усе, що наливають і подають у Faust.
        </p>
      </div>
      {categories.length > 0 ? (
        <MenuSections categories={categories} />
      ) : (
        <div className={`container ${styles.empty}`}>
          <p className={styles.emptyTitle}>Барна карта зараз оновлюється.</p>
          <p className={styles.emptyText}>
            Загляньте за кілька хвилин. А якщо ви вже за стійкою — бармен розкаже все й без сайту.
          </p>
        </div>
      )}
    </>
  );
};

export default MenuPage;
