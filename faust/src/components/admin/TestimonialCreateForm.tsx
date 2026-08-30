"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { TESTIMONIAL_META_MAX, TESTIMONIAL_NAME_MAX, TESTIMONIAL_TEXT_MAX, testimonialCreateSchema } from "@/schemas/testimonial";
import { useAdminMutation } from "./useAdminMutation";
import styles from "./TestimonialCreateForm.module.css";

type FieldErrors = { text?: string; name?: string; meta?: string };

export const TestimonialCreateForm = () => {
  const { mutate, pendingKey } = useAdminMutation();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [meta, setMeta] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = testimonialCreateSchema.safeParse({ text, name, meta, visible: true });

    if (!parsed.success) {
      const collected: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (field === "text" && !collected.text) collected.text = issue.message;
        if (field === "name" && !collected.name) collected.name = issue.message;
        if (field === "meta" && !collected.meta) collected.meta = issue.message;
      }

      setErrors(collected);
      return;
    }

    setErrors({});

    const outcome = await mutate(
      "create",
      { url: "/api/admin/testimonials", method: "POST", body: parsed.data },
      { success: "Відгук додано" },
    );

    if (!outcome.ok) {
      if (outcome.fieldErrors) setErrors(outcome.fieldErrors as FieldErrors);
      return;
    }

    setText("");
    setName("");
    setMeta("");
  };

  const pending = pendingKey === "create";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2 className={styles.title}>Новий відгук</h2>

      <Field
        as="textarea"
        label="Текст відгуку"
        name="text"
        required
        rows={3}
        maxLength={TESTIMONIAL_TEXT_MAX}
        placeholder="Найкращий звук у місті — без перебільшень."
        value={text}
        error={errors.text}
        onChange={(event) => setText(event.target.value)}
      />

      <div className={styles.pair}>
        <Field
          label="Ім'я"
          name="name"
          required
          maxLength={TESTIMONIAL_NAME_MAX}
          placeholder="Софія М."
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />

        <Field
          label="Підпис"
          name="meta"
          required
          maxLength={TESTIMONIAL_META_MAX}
          placeholder="гостя клубу"
          value={meta}
          error={errors.meta}
          onChange={(event) => setMeta(event.target.value)}
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Додаємо…" : "Додати відгук"}
      </button>
    </form>
  );
};
