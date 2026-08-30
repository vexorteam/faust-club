"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import {
  SOCIAL_HANDLE_MAX,
  SOCIAL_NAME_MAX,
  URL_MAX,
  socialFormSchema,
  type AdminSocial,
} from "@/schemas/settings";
import type { MoveDirection } from "@/schemas/category";
import { ConfirmAction } from "./ConfirmAction";
import { MoveButtons } from "./MoveButtons";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./SocialRow.module.css";

export type SocialRowProps = {
  social: AdminSocial;
  isFirst: boolean;
  isLast: boolean;
};

type FieldErrors = { name?: string; href?: string; handle?: string };

export const SocialRow = ({ social, isFirst, isLast }: SocialRowProps) => {
  const { mutate, pendingKey } = useAdminMutation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(social.name);
  const [href, setHref] = useState(social.href);
  const [handle, setHandle] = useState(social.handle);
  const [errors, setErrors] = useState<FieldErrors>({});

  const startEditing = () => {
    setName(social.name);
    setHref(social.href);
    setHandle(social.handle);
    setErrors({});
    setEditing(true);
  };

  const save = async () => {
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
      "save",
      { url: `/api/admin/settings/socials/${social.id}`, method: "PATCH", body: parsed.data },
      { success: "Збережено" },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    setEditing(false);
  };

  const move = (direction: MoveDirection) =>
    void mutate(
      "move",
      { url: `/api/admin/settings/socials/${social.id}/move`, method: "POST", body: { direction } },
      { success: "Порядок оновлено" },
    );

  const remove = () =>
    void mutate(
      "delete",
      { url: `/api/admin/settings/socials/${social.id}`, method: "DELETE" },
      { success: `«${social.name}» видалено` },
    );

  if (editing) {
    return (
      <li className={styles.row}>
        <div className={styles.editor}>
          <Field
            label="Назва"
            required
            maxLength={SOCIAL_NAME_MAX}
            value={name}
            error={errors.name}
            onChange={(event) => setName(event.target.value)}
          />

          <Field
            label="Позначка"
            required
            maxLength={SOCIAL_HANDLE_MAX}
            value={handle}
            error={errors.handle}
            onChange={(event) => setHandle(event.target.value)}
          />

          <Field
            label="Посилання на профіль"
            required
            maxLength={URL_MAX}
            value={href}
            error={errors.href}
            onChange={(event) => setHref(event.target.value)}
          />

          <div className={styles.editorActions}>
            <button type="button" className={styles.save} disabled={pendingKey === "save"} onClick={() => void save()}>
              {pendingKey === "save" ? "Зберігаємо…" : "Зберегти"}
            </button>

            <button type="button" className={styles.action} onClick={() => setEditing(false)}>
              Скасувати
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.row}>
      <div className={styles.identity}>
        <span className={styles.label}>{social.name}</span>
        <span className={styles.meta}>
          {social.handle} · {social.href}
        </span>
      </div>

      <div className={styles.controls}>
        <MoveButtons what={social.name} isFirst={isFirst} isLast={isLast} pending={pendingKey === "move"} onMove={move} />

        <button type="button" className={styles.action} onClick={startEditing}>
          Редагувати
        </button>

        <ConfirmAction
          label="Видалити"
          question={`Видалити «${social.name}»? Скасувати неможливо`}
          pending={pendingKey === "delete"}
          onConfirm={remove}
        />
      </div>
    </li>
  );
};
