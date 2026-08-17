import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/session";
import { listAtmospherePhotos } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AtmosphereBoard } from "@/components/admin/AtmosphereBoard";

/** Photos of the "Атмосфера" section on the home page. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Атмосфера",
  robots: { index: false, follow: false, nocache: true },
};

const AtmospherePage = async () => {
  await requireAdminOrRedirect();

  const photos = await listAtmospherePhotos();

  return (
    <section>
      <AdminPageHeader
        eyebrow="головна"
        title="Атмосфера"
        description="Плитки на головній сторінці — у тому ж порядку, що й тут."
      />

      <AtmosphereBoard photos={photos} />
    </section>
  );
};

export default AtmospherePage;
