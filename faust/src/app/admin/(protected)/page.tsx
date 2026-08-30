import { requireAdminOrRedirect } from "@/lib/session";
import { listItemGroups } from "@/lib/admin";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ItemsBoard } from "@/components/admin/ItemsBoard";

export const dynamic = "force-dynamic";

const AdminItemsPage = async () => {
  await requireAdminOrRedirect();

  const groups = await listItemGroups();

  return (
    <section>
      <AdminPageHeader
        eyebrow="меню"
        title="Позиції"
        description="Ціна, наявність і порядок зберігаються одразу. Решта — у формі позиції."
        action={groups.length > 0 ? { href: "/admin/items/new", label: "Додати позицію" } : undefined}
      />

      {groups.length === 0 ? (
        <AdminNotice action={{ href: "/admin/categories", label: "До категорій" }}>
          Категорій ще немає, а позиція завжди належить категорії. Створіть першу — наприклад, «Авторські коктейлі».
        </AdminNotice>
      ) : (
        <ItemsBoard groups={groups} />
      )}
    </section>
  );
};

export default AdminItemsPage;
