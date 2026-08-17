import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminOrRedirect } from "@/lib/session";
import { getItem, listCategories } from "@/lib/admin";
import { NotFoundError } from "@/errors";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ItemForm } from "@/components/admin/ItemForm";
import type { AdminMenuItem } from "@/schemas/menu-item";

/**
 * Editing one position.
 *
 * An unknown id is the 404 page, not an error screen: it usually means the item
 * was deleted from another device, and that is not a failure.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Позиція",
  robots: { index: false, follow: false, nocache: true },
};

const loadItem = async (id: string): Promise<AdminMenuItem> => {
  try {
    return await getItem(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();

    throw error;
  }
};

const EditItemPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAdminOrRedirect();

  const { id } = await params;
  const [item, categories] = await Promise.all([loadItem(id), listCategories()]);

  return (
    <section>
      <AdminPageHeader eyebrow="меню" title={item.name} description="Зміни видно на сайті за кілька секунд." />

      <ItemForm categories={categories} item={item} />
    </section>
  );
};

export default EditItemPage;
