import { requireAdminOrRedirect } from "@/lib/session";
import styles from "./page.module.css";

/**
 * Placeholder landing page: somewhere for the login form to lead until the
 * menu CRUD arrives (step 10). The guard is repeated here on purpose — a
 * layout is not a lock, every route checks the session itself (§3.5).
 */

export const dynamic = "force-dynamic";

const AdminHomePage = async () => {
  const user = await requireAdminOrRedirect();

  return (
    <section>
      <h1 className={styles.title}>Вітаємо, {user.name}</h1>
      <p className={styles.text}>
        Вхід працює — сесія жива. Керування меню, категоріями та фотографіями зʼявиться тут наступним кроком.
      </p>
    </section>
  );
};

export default AdminHomePage;
