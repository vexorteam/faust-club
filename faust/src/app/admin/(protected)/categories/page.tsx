import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/session";
import { listCategories } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryList } from "@/components/admin/CategoryList";

/** Sections of the menu: their titles, their order and whether they are shown. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Категорії",
  robots: { index: false, follow: false, nocache: true },
};

const CategoriesPage = async () => {
  await requireAdminOrRedirect();

  const categories = await listCategories();

  return (
    <section>
      <AdminPageHeader
        eyebrow="меню"
        title="Категорії"
        description="Порядок категорій тут — це порядок розділів на сторінці меню. Прихована категорія зникає з сайту разом зі своїми позиціями."
      />

      <CategoryList categories={categories} />
    </section>
  );
};

export default CategoriesPage;
