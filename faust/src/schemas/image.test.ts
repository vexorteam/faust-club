import { describe, expect, it } from "vitest"

import { describeUploadProblem, MAX_UPLOAD_BYTES } from "@/schemas/image"

const file = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: "IMG_0421.jpg",
  size: 2 * 1024 * 1024,
  type: "image/jpeg",
  ...over,
})

describe("upload rules", () => {
  it("lets an ordinary phone shot through", () => {
    expect(describeUploadProblem(file())).toBeNull()
  })

  it("names the size in the refusal, so the owner knows how far over it is", () => {
    const problem = describeUploadProblem(file({ size: 7.4 * 1024 * 1024 }))

    expect(problem).toBe("Файл 7.4 МБ. Максимум — 5 МБ")
  })

  it("accepts a file exactly at the limit and refuses the next byte", () => {
    expect(describeUploadProblem(file({ size: MAX_UPLOAD_BYTES }))).toBeNull()
    expect(describeUploadProblem(file({ size: MAX_UPLOAD_BYTES + 1 }))).not.toBeNull()
  })

  it("takes a HEIC frame from an iPhone even when the browser reports no type", () => {
    expect(describeUploadProblem(file({ name: "IMG_0421.HEIC", type: "" }))).toBeNull()
  })

  it("refuses a document that only pretends to be a picture", () => {
    expect(describeUploadProblem(file({ name: "menu.pdf", type: "application/pdf" }))).toContain("Формат не підходить")
    expect(describeUploadProblem(file({ name: "menu.pdf", type: "" }))).toContain("Формат не підходить")
  })

  it("refuses an empty file instead of uploading nothing", () => {
    expect(describeUploadProblem(file({ size: 0 }))).toBe("Файл порожній — виберіть інший")
  })

  it("asks for a photo when none was chosen", () => {
    expect(describeUploadProblem(null)).toBe("Виберіть фото")
  })
})
