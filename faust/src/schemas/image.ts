import { z } from "zod";

/**
 * Rules every photo upload obeys, shared by the file picker and the route
 * handler (§5.3.1, "Спільні правила для завантаження файлів").
 *
 * This is a convenience check, not a boundary: the API is the one that reads
 * magic bytes and decides. Checking here only spares a phone the upload of a
 * 6 MB frame that was never going to be accepted.
 */

export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Same bound as the atmosphere caption (§5.2): `imageAlt` is 120 chars there too. */
export const IMAGE_ALT_MIN = 5;
export const IMAGE_ALT_MAX = 120;

const ALT_MESSAGE = `Опис фото — від ${IMAGE_ALT_MIN} до ${IMAGE_ALT_MAX} символів`;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

/** Extensions matter because Safari hands over a HEIC frame with an empty MIME type. */
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] as const;

/** Value for the `accept` attribute: both lists, so the picker filters on either. */
export const IMAGE_ACCEPT_ATTRIBUTE = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_EXTENSIONS].join(",");

const FORMAT_MESSAGE = "Формат не підходить. Візьміть JPEG, PNG, WebP або HEIC з айфона";

const EMPTY_MESSAGE = "Файл порожній — виберіть інший";

const MISSING_MESSAGE = "Виберіть фото";

/** What the frontend needs to know about a file, so tests do not need a real one. */
export type UploadCandidate = { name: string; size: number; type: string };

const hasAcceptedExtension = (name: string): boolean =>
  ACCEPTED_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));

const isAcceptedType = ({ name, type }: UploadCandidate): boolean =>
  type.length > 0
    ? (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type.toLowerCase())
    : hasAcceptedExtension(name);

/**
 * The human sentence to show, or `null` when the file is worth sending.
 * Wording matches `FileTooLargeError.forSize()` — the owner should not be able
 * to tell whether the refusal came from the browser or from the server.
 */
export const describeUploadProblem = (file: UploadCandidate | null): string | null => {
  if (!file) return MISSING_MESSAGE;
  if (file.size === 0) return EMPTY_MESSAGE;

  if (file.size > MAX_UPLOAD_BYTES) {
    return `Файл ${(file.size / 1024 / 1024).toFixed(1)} МБ. Максимум — ${MAX_UPLOAD_MB} МБ`;
  }

  return isAcceptedType(file) ? null : FORMAT_MESSAGE;
};

/** A photo without a description is unusable for anyone who cannot see it. */
export const imageAltSchema = z.string().trim().min(IMAGE_ALT_MIN, ALT_MESSAGE).max(IMAGE_ALT_MAX, ALT_MESSAGE);
