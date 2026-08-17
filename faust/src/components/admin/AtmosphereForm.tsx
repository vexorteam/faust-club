"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { PHOTO_ALT_MAX, PHOTO_LABEL_MAX, atmosphereFormSchema, type AtmospherePhoto } from "@/schemas/atmosphere";
import { CheckboxField } from "./CheckboxField";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./AtmosphereForm.module.css";

/**
 * Texts of one atmosphere tile.
 *
 * Two fields that look similar and are not: the caption is read by whoever
 * looks at the photo, the description is read *instead* of the photo. The hints
 * spell that out, because the natural instinct is to type the same thing twice.
 *
 * The picture is only shown here. Replacing it is an upload, and uploads arrive
 * with step 11.
 */

type FieldErrors = { label?: string; imageAlt?: string };

export const AtmosphereForm = ({ photo }: { photo: AtmospherePhoto }) => {
  const router = useRouter();
  const { mutate, pendingKey } = useAdminMutation();
  const [label, setLabel] = useState(photo.label);
  const [imageAlt, setImageAlt] = useState(photo.imageAlt);
  const [visible, setVisible] = useState(photo.visible);
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = atmosphereFormSchema.safeParse({ label, imageAlt, visible });

    if (!parsed.success) {
      const collected: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (field === "label" && !collected.label) collected.label = issue.message;
        if (field === "imageAlt" && !collected.imageAlt) collected.imageAlt = issue.message;
      }

      setErrors(collected);
      return;
    }

    setErrors({});

    const outcome = await mutate(
      "save",
      { url: `/api/admin/atmosphere/${photo.id}`, method: "PATCH", body: parsed.data },
      { success: "Збережено", refresh: false },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    router.push("/admin/atmosphere");
    router.refresh();
  };

  const saving = pendingKey === "save";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Image src={photo.image} alt={photo.imageAlt} width={480} height={320} className={styles.preview} />

      <p className={styles.photoHint}>Заміна знімка зʼявиться разом із завантаженням фото, наступним кроком.</p>

      <Field
        label="Підпис на плитці"
        required
        maxLength={PHOTO_LABEL_MAX}
        placeholder="Танцпол"
        value={label}
        error={errors.label}
        onChange={(event) => setLabel(event.target.value)}
      />

      <p className={styles.hint}>Коротке слово, яке гість читає поверх фото.</p>

      <Field
        as="textarea"
        label="Опис для скрінрідера"
        required
        maxLength={PHOTO_ALT_MAX}
        placeholder="Танцпол Faust під час нічного сету"
        value={imageAlt}
        error={errors.imageAlt}
        onChange={(event) => setImageAlt(event.target.value)}
      />

      <p className={styles.hint}>
        Те, що прочитають замість картинки — тому не дублюйте підпис, а опишіть, що саме на знімку.
      </p>

      <CheckboxField
        label="Показувати на головній"
        checked={visible}
        onChange={(event) => setVisible(event.target.checked)}
      />

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "Зберігаємо…" : "Зберегти"}
        </button>

        <Link href="/admin/atmosphere" className={styles.cancel}>
          Скасувати
        </Link>
      </div>
    </form>
  );
};
