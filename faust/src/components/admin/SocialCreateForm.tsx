"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { SOCIAL_HANDLE_MAX, SOCIAL_NAME_MAX, URL_MAX, socialFormSchema } from "@/schemas/settings";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./SocialCreateForm.module.css";

type FieldErrors = { name?: string; href?: string; handle?: string };

export const SocialCreateForm = () => {
  const { mutate, pendingKey } = useAdminMutation();
  const [name, setName] = useState("");
  const [href, setHref] = useState("");
  const [handle, setHandle] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = socialFormSchema.safeParse({ name, href, handle });

    if (!parsed.success) {
      const collected: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (field === "name" && !collected.name) collected.name = issue.message;
        if (field === "href" && !collected.href) collected.href = issue.message;
        if (field === "handle" && !collected.handle) collected.handle = issue.message;
      }

      setErrors(collected);
      return;
    }

    setErrors({});

    const outcome = await mutate(
      "create",
      { url: "/api/admin/settings/socials", method: "POST", body: parsed.data },
      { success: "Соцмережу додано" },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    setName("");
    setHref("");
    setHandle("");
  };

  const pending = pendingKey === "create";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2 className={styles.title}>Нова соцмережа</h2>

      <div className={styles.pair}>
        <Field
          label="Назва"
          name="name"
          required
          maxLength={SOCIAL_NAME_MAX}
          placeholder="Instagram"
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />

        <Field
          label="Позначка"
          name="handle"
          required
          maxLength={SOCIAL_HANDLE_MAX}
          placeholder="@faust.club"
          value={handle}
          error={errors.handle}
          onChange={(event) => setHandle(event.target.value)}
        />
      </div>

      <Field
        label="Посилання на профіль"
        name="href"
        required
        maxLength={URL_MAX}
        placeholder="https://www.instagram.com/faust.club"
        value={href}
        error={errors.href}
        onChange={(event) => setHref(event.target.value)}
      />

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Додаємо…" : "Додати соцмережу"}
      </button>
    </form>
  );
};
