"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import {
  ADDRESS_MAX,
  ADDRESS_SHORT_MAX,
  AGE_RESTRICTION_MAX,
  EMAIL_MAX,
  PHONE_MAX,
  SITE_DESCRIPTION_MAX,
  SITE_NAME_MAX,
  TAGLINE_MAX,
  URL_MAX,
  siteSettingsFormSchema,
  type AdminSiteSettings,
  type SiteSettingsInput,
} from "@/schemas/settings";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./SiteSettingsForm.module.css";

/**
 * The club's own facts, in one form: what used to be hard-coded in
 * `data/site.ts` and is now the owner's to edit (§13 follow-up).
 *
 * One save button for the whole card rather than per-field autosave — these
 * fields read together (a phone number without its `tel:` link is a bug half
 * fixed), so a stray keystroke should not go live before the rest is right.
 */

type FieldErrors = Partial<Record<keyof SiteSettingsInput, string>>;

const asFormState = (settings: AdminSiteSettings): SiteSettingsInput => ({
  name: settings.name,
  tagline: settings.tagline,
  description: settings.description,
  phone: settings.phone,
  phoneHref: settings.phoneHref,
  email: settings.email,
  emailHref: settings.emailHref,
  address: settings.address,
  addressShort: settings.addressShort,
  mapsUrl: settings.mapsUrl,
  mapsEmbedQuery: settings.mapsEmbedQuery,
  latitude: settings.latitude,
  longitude: settings.longitude,
  ageRestriction: settings.ageRestriction,
});

export const SiteSettingsForm = ({ settings }: { settings: AdminSiteSettings }) => {
  const { mutate, pendingKey } = useAdminMutation();
  const [form, setForm] = useState<SiteSettingsInput>(() => asFormState(settings));
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof SiteSettingsInput>(key: K, value: SiteSettingsInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const parsed = siteSettingsFormSchema.safeParse(form);

    if (!parsed.success) {
      const collected: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (typeof field === "string" && !collected[field as keyof SiteSettingsInput]) {
          collected[field as keyof SiteSettingsInput] = issue.message;
        }
      }

      setErrors(collected);
      return;
    }

    setErrors({});

    const outcome = await mutate(
      "save",
      { url: "/api/admin/settings", method: "PATCH", body: parsed.data },
      { success: "Налаштування збережено" },
    );

    if (!outcome.ok && outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors);
  };

  const pending = pendingKey === "save";

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Загальне</h2>
        <div className={styles.pair}>
          <Field
            label="Назва клубу"
            required
            maxLength={SITE_NAME_MAX}
            value={form.name}
            error={errors.name}
            onChange={(event) => set("name", event.target.value)}
          />
          <Field
            label="Вікові обмеження"
            required
            maxLength={AGE_RESTRICTION_MAX}
            placeholder="16+"
            value={form.ageRestriction}
            error={errors.ageRestriction}
            onChange={(event) => set("ageRestriction", event.target.value)}
          />
        </div>

        <Field
          label="Слоган"
          required
          maxLength={TAGLINE_MAX}
          value={form.tagline}
          error={errors.tagline}
          onChange={(event) => set("tagline", event.target.value)}
        />

        <Field
          as="textarea"
          label="Опис (для головного екрана й соцмереж)"
          required
          rows={3}
          maxLength={SITE_DESCRIPTION_MAX}
          value={form.description}
          error={errors.description}
          onChange={(event) => set("description", event.target.value)}
        />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Контакти</h2>
        <div className={styles.pair}>
          <Field
            label="Телефон"
            required
            maxLength={PHONE_MAX}
            placeholder="+380 66 727 9143"
            value={form.phone}
            error={errors.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
          <Field
            label="Посилання tel:"
            required
            maxLength={PHONE_MAX}
            placeholder="tel:+380667279143"
            value={form.phoneHref}
            error={errors.phoneHref}
            onChange={(event) => set("phoneHref", event.target.value)}
          />
        </div>

        <div className={styles.pair}>
          <Field
            label="Пошта"
            required
            maxLength={EMAIL_MAX}
            placeholder="hello@faust.bar"
            value={form.email}
            error={errors.email}
            onChange={(event) => set("email", event.target.value)}
          />
          <Field
            label="Посилання mailto:"
            required
            maxLength={EMAIL_MAX}
            placeholder="mailto:hello@faust.bar"
            value={form.emailHref}
            error={errors.emailHref}
            onChange={(event) => set("emailHref", event.target.value)}
          />
        </div>

        <div className={styles.pair}>
          <Field
            label="Повна адреса"
            required
            maxLength={ADDRESS_MAX}
            value={form.address}
            error={errors.address}
            onChange={(event) => set("address", event.target.value)}
          />
          <Field
            label="Коротка адреса"
            required
            maxLength={ADDRESS_SHORT_MAX}
            value={form.addressShort}
            error={errors.addressShort}
            onChange={(event) => set("addressShort", event.target.value)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Карта</h2>
        <Field
          label="Посилання на Google Maps"
          required
          maxLength={URL_MAX}
          value={form.mapsUrl}
          error={errors.mapsUrl}
          onChange={(event) => set("mapsUrl", event.target.value)}
        />
        <Field
          label="Рядок пошуку для вбудованої карти"
          required
          maxLength={ADDRESS_MAX}
          value={form.mapsEmbedQuery}
          error={errors.mapsEmbedQuery}
          onChange={(event) => set("mapsEmbedQuery", event.target.value)}
        />
        <div className={styles.pair}>
          <Field
            label="Широта"
            required
            type="number"
            step="0.0001"
            value={form.latitude}
            error={errors.latitude}
            onChange={(event) => set("latitude", Number(event.target.value))}
          />
          <Field
            label="Довгота"
            required
            type="number"
            step="0.0001"
            value={form.longitude}
            error={errors.longitude}
            onChange={(event) => set("longitude", Number(event.target.value))}
          />
        </div>
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Зберігаємо…" : "Зберегти налаштування"}
      </button>
    </form>
  );
};
