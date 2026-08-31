"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { IMAGE_ACCEPT_ATTRIBUTE, MAX_UPLOAD_MB, describeUploadProblem } from "@/schemas/image";
import { ConfirmAction } from "./ConfirmAction";
import styles from "./ImageInput.module.css";

export type ImageInputProps = {
  /** Photo the API already stores, if any */
  image?: string | null;
  imageAlt?: string | null;
  /** Chosen, not yet sent */
  file: File | null;
  onSelect: (file: File | null) => void;
  /** Present in immediate mode: sends the chosen file on its own */
  onUpload?: () => void;
  uploading?: boolean;
  /** Present when the stored photo can be taken away */
  onRemove?: () => void;
  removing?: boolean;
  /** Message from the server, shown under the picker */
  error?: string;
  hint?: string;
  disabled?: boolean;
};

const PREVIEW_ALT = "Вибране фото — попередній перегляд";

const EMPTY_TEXT = "Фото ще немає";

export const ImageInput = ({
  image,
  imageAlt,
  file,
  onSelect,
  onUpload,
  uploading = false,
  onRemove,
  removing = false,
  error,
  hint,
  disabled = false,
}: ImageInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  /** An object URL is a handle into memory: it has to be given back. */
  useEffect(() => {
    if (!preview) return;

    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    const found = chosen ? describeUploadProblem(chosen) : null;
    const accepted = chosen && !found ? chosen : null;

    setProblem(found);
    setPreview(accepted ? URL.createObjectURL(accepted) : null);
    onSelect(accepted);
  };

  const clear = () => {
    setProblem(null);
    setPreview(null);
    onSelect(null);

    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = uploading || removing || disabled;
  const message = problem ?? error;

  return (
    <div className={styles.field}>
      <span className={styles.title}>Фото</span>

      <div className={styles.frame}>
        {file && preview ? (
          // Local object URL: there is nothing for the image optimizer to do here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={PREVIEW_ALT} className={styles.preview} />
        ) : image ? (
          <Image src={image} alt={imageAlt ?? ""} width={320} height={320} className={styles.preview} />
        ) : (
          <span className={styles.empty}>{EMPTY_TEXT}</span>
        )}
      </div>

      <div className={styles.controls}>
        <label className={styles.picker}>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            className={styles.input}
            disabled={busy}
            onChange={onChange}
          />
          <span>{image || file ? "Замінити фото" : "Вибрати фото"}</span>
        </label>

        {file && onUpload && (
          <button type="button" className={styles.upload} disabled={busy} onClick={onUpload}>
            {uploading ? "Завантажуємо…" : "Завантажити"}
          </button>
        )}

        {file && (
          <button type="button" className={styles.reset} disabled={busy} onClick={clear}>
            Скасувати вибір
          </button>
        )}

        {image && !file && onRemove && (
          <ConfirmAction
            label="Видалити фото"
            question="Видалити фото? Позиція лишиться в меню без знімка"
            confirmLabel="Так, видалити"
            pending={removing}
            onConfirm={onRemove}
          />
        )}
      </div>

      {message && (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}

      <span className={styles.hint}>{hint ?? `JPEG, PNG, WebP або HEIC з айфона. До ${MAX_UPLOAD_MB} МБ.`}</span>
    </div>
  );
};
