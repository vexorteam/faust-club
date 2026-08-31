"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { ITEM_DESCRIPTION_MAX, ITEM_NAME_MAX, ITEM_VOLUME_MAX, menuItemFormSchema } from "@/schemas/menu-item";
import type { AdminMenuItem } from "@/schemas/menu-item";
import { IMAGE_ALT_MAX, imageAltSchema } from "@/schemas/image";
import { CheckboxField } from "./CheckboxField";
import { ConfirmAction } from "./ConfirmAction";
import { ImageInput } from "./ImageInput";
import { SelectField } from "./SelectField";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./ItemForm.module.css";

const BADGE_OPTIONS = [
  { value: "", label: "Без мітки" },
  { value: "new", label: "Нове" },
  { value: "hit", label: "Хіт" },
] as const;

type FieldName = "categoryId" | "name" | "description" | "price" | "volume" | "badge";

type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  volume: string;
  badge: string;
  available: boolean;
};

export type ItemFormProps = {
  categories: readonly { id: string; label: string }[];
  item?: AdminMenuItem;
};

const initialValues = (categories: readonly { id: string }[], item?: AdminMenuItem): FormValues => ({
  categoryId: item?.categoryId ?? categories[0]?.id ?? "",
  name: item?.name ?? "",
  description: item?.description ?? "",
  price: item ? String(item.price) : "",
  volume: item?.volume ?? "",
  badge: item?.badge ?? "",
  available: item?.available ?? true,
});

const collectFieldErrors = (issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors => {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !(field in errors)) {
      errors[field as FieldName] = issue.message;
    }
  }

  return errors;
};

/** The id of the position the API answered with, so its photo can follow. */
const readItemId = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) return null;

  const { id } = data as { id?: unknown };

  return typeof id === "string" && id.length > 0 ? id : null;
};

export const ItemForm = ({ categories, item }: ItemFormProps) => {
  const router = useRouter();
  const { mutate, pendingKey } = useAdminMutation();
  const [values, setValues] = useState<FormValues>(() => initialValues(categories, item));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoAlt, setPhotoAlt] = useState(item?.imageAlt ?? "");
  const [photoError, setPhotoError] = useState<string | undefined>(undefined);
  const [altError, setAltError] = useState<string | undefined>(undefined);

  /** A stored photo needs its description as much as a freshly picked one. */
  const describesPhoto = Boolean(photoFile) || Boolean(item?.image);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  /** A picture nobody can describe is a picture a screen reader has to skip. */
  const checkAlt = (): string | null => {
    const parsed = imageAltSchema.safeParse(photoAlt);

    if (parsed.success) return parsed.data;

    setAltError(parsed.error.issues[0]?.message);

    return null;
  };

  /**
   * The photo is a second request, so the confirmation belongs to it: the save
   * that went before it stayed quiet on purpose, and announcing «Збережено»
   * while the frame is still on its way would be a lie with a picture missing.
   */
  const sendPhoto = async (id: string, alt: string, success: string) => {
    const body = new FormData();

    body.set("file", photoFile as File);
    body.set("alt", alt);

    return mutate("photo", { url: `/api/admin/items/${id}/image`, method: "POST", body }, { success, refresh: false });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = menuItemFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      return;
    }

    const alt = describesPhoto ? checkAlt() : "";

    if (describesPhoto && !alt) return;

    setFieldErrors({});
    setPhotoError(undefined);
    setAltError(undefined);

    const body = alt && !photoFile ? { ...parsed.data, imageAlt: alt } : parsed.data;

    const saved = item ? "Збережено" : "Позицію додано";

    const outcome = await mutate(
      "save",
      item
        ? { url: `/api/admin/items/${item.id}`, method: "PATCH", body }
        : { url: "/api/admin/items", method: "POST", body: parsed.data },
      { success: photoFile ? undefined : saved, refresh: false },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    if (photoFile && alt) {
      const id = item?.id ?? readItemId(outcome.data);

      if (!id) {
        setPhotoError("Позицію збережено, але фото завантажити не вдалося. Відкрийте позицію й спробуйте ще раз");
        return;
      }

      const uploaded = await sendPhoto(id, alt, saved);

      /** Saved without its photo — say so and stay, so the upload can be retried */
      if (!uploaded.ok) {
        if (!item) router.push(`/admin/items/${id}`);

        return;
      }
    }

    router.push("/admin");
    router.refresh();
  };

  const removePhoto = async () => {
    if (!item) return;

    const outcome = await mutate(
      "photo",
      { url: `/api/admin/items/${item.id}/image`, method: "DELETE" },
      { success: "Фото видалено" },
    );

    if (outcome.ok) setPhotoError(undefined);
  };

  const remove = async () => {
    if (!item) return;

    const outcome = await mutate(
      "delete",
      { url: `/api/admin/items/${item.id}`, method: "DELETE" },
      { success: `«${item.name}» видалено`, refresh: false },
    );

    if (!outcome.ok) return;

    router.push("/admin");
    router.refresh();
  };

  const saving = pendingKey === "save";
  const uploading = pendingKey === "photo";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <SelectField
        label="Категорія"
        required
        value={values.categoryId}
        error={fieldErrors.categoryId}
        options={
          categories.length > 0
            ? categories.map((category) => ({ value: category.id, label: category.label }))
            : [{ value: "", label: "Категорій ще немає" }]
        }
        hint={item ? "Зміна категорії переносить позицію в інший розділ меню" : undefined}
        onChange={(event) => update("categoryId", event.target.value)}
      />

      <Field
        label="Назва"
        name="name"
        required
        maxLength={ITEM_NAME_MAX}
        value={values.name}
        error={fieldErrors.name}
        onChange={(event) => update("name", event.target.value)}
      />

      <Field
        as="textarea"
        label="Склад"
        name="description"
        maxLength={ITEM_DESCRIPTION_MAX}
        placeholder="джин, лайм, тонік, розмарин"
        value={values.description}
        error={fieldErrors.description}
        onChange={(event) => update("description", event.target.value)}
      />

      <div className={styles.pair}>
        <Field
          label="Ціна, ₴"
          name="price"
          required
          inputMode="numeric"
          value={values.price}
          error={fieldErrors.price}
          onChange={(event) => update("price", event.target.value)}
        />

        <Field
          label="Об'єм"
          name="volume"
          maxLength={ITEM_VOLUME_MAX}
          placeholder="250 мл"
          value={values.volume}
          error={fieldErrors.volume}
          onChange={(event) => update("volume", event.target.value)}
        />
      </div>

      <SelectField
        label="Мітка"
        value={values.badge}
        error={fieldErrors.badge}
        options={BADGE_OPTIONS}
        onChange={(event) => update("badge", event.target.value)}
      />

      <CheckboxField
        label="Є в наявності"
        checked={values.available}
        hint="Знята позиція лишається в меню приглушеною, з підписом «немає»"
        onChange={(event) => update("available", event.target.checked)}
      />

      <div className={styles.photo}>
        <ImageInput
          image={item?.image}
          imageAlt={item?.imageAlt}
          file={photoFile}
          onSelect={(file) => {
            setPhotoFile(file);
            setPhotoError(undefined);
          }}
          onRemove={item?.image ? () => void removePhoto() : undefined}
          removing={pendingKey === "photo"}
          error={photoError}
          disabled={saving}
          hint={`Знімок із телефона підійде як є. JPEG, PNG, WebP або HEIC, до 5 МБ. Фото поїде разом із ${item ? "збереженням" : "публікацією"}.`}
        />

        {describesPhoto && (
          <Field
            as="textarea"
            label="Опис фото для скрінрідера"
            required
            maxLength={IMAGE_ALT_MAX}
            placeholder="Коктейль Faust Sour у келиху купе"
            error={altError}
            value={photoAlt}
            onChange={(event) => {
              setPhotoAlt(event.target.value);
              setAltError(undefined);
            }}
          />
        )}

        {describesPhoto && (
          <p className={styles.photoHint}>Що прочитає вголос той, хто не бачить знімка. Не назва позиції.</p>
        )}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={saving || uploading}>
          {uploading ? "Завантажуємо фото…" : saving ? "Зберігаємо…" : item ? "Зберегти" : "Опублікувати"}
        </button>

        <Link href="/admin" className={styles.cancel}>
          Скасувати
        </Link>
      </div>

      {item && (
        <div className={styles.danger}>
          <ConfirmAction
            label="Видалити позицію"
            question={`Видалити «${item.name}»? Скасувати неможливо`}
            pending={pendingKey === "delete"}
            onConfirm={() => void remove()}
          />
        </div>
      )}
    </form>
  );
};
