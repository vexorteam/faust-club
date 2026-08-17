import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminOrRedirect } from "@/lib/session";
import { findAtmospherePhoto } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AtmosphereForm } from "@/components/admin/AtmosphereForm";

/** Caption and screen-reader description of one tile. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Фото атмосфери",
  robots: { index: false, follow: false, nocache: true },
};

const EditAtmospherePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requireAdminOrRedirect();

  const { id } = await params;
  const photo = await findAtmospherePhoto(id);

  if (!photo) notFound();

  return (
    <section>
      <AdminPageHeader eyebrow="головна" title={photo.label} description="Підпис і опис редагуються окремо від фото." />

      <AtmosphereForm photo={photo} />
    </section>
  );
};

export default EditAtmospherePage;
