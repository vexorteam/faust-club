import type { Metadata } from "next";
// import { getMenuSections } from "@/lib/menu"; <- backend
import { menu } from "@/data/menu";
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
  const categories = menu; // <- backend

  return (
    <>
      <div className={`container ${styles.head}`}>
        <span className="eyebrow">Барна карта</span>
        <h1 className={styles.title}>Меню Faust</h1>
        <p className={styles.subtitle}>
          Від авторських коктейлів до класики та безалкогольних варіантів — усе, що наливають і подають у Faust.
        </p>
      </div>
      <MenuSections categories={categories} />
    </>
  );
};

export default MenuPage;
