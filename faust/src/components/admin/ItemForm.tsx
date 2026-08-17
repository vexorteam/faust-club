"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { ITEM_DESCRIPTION_MAX, ITEM_NAME_MAX, ITEM_VOLUME_MAX, menuItemFormSchema } from "@/schemas/menu-item";
import type { AdminMenuItem } from "@/schemas/menu-item";
import { CheckboxField } from "./CheckboxField";
import { ConfirmAction } from "./ConfirmAction";
import { SelectField } from "./SelectField";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./ItemForm.module.css";

/**
 * One form for both creating and editing a position.
 *
 * The category select is required, because an item without a category has
 * nowhere to appear on the showcase. Changing it here *is* the "move to another
 * category" feature — after saving, the item is gone from the old group and
 * present in the new one.
 *
 * Values live in state, so a failed request leaves everything the owner typed
 * on screen. Losing a filled-in form because the bar's wifi blinked is not an
 * acceptable way to report an error.
 */

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

export const ItemForm = ({ categories, item }: ItemFormProps) => {
  const router = useRouter();
  const { mutate, pendingKey } = useAdminMutation();
  const [values, setValues] = useState<FormValues>(() => initialValues(categories, item));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = menuItemFormSchema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      return;
    }

    setFieldErrors({});

    const outcome = await mutate(
      "save",
      item
        ? { url: `/api/admin/items/${item.id}`, method: "PATCH", body: parsed.data }
        : { url: "/api/admin/items", method: "POST", body: parsed.data },
      { success: item ? "Збережено" : "Позицію додано", refresh: false },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    router.push("/admin");
    router.refresh();
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
        <span className={styles.photoLabel}>Фото</span>

        {item?.image ? (
          <Image
            src={item.image}
            alt={item.imageAlt ?? item.name}
            width={160}
            height={160}
            className={styles.preview}
          />
        ) : (
          <p className={styles.photoHint}>Фото ще немає. Завантаження фотографій зʼявиться наступним кроком.</p>
        )}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "Зберігаємо…" : item ? "Зберегти" : "Опублікувати"}
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
