import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiUnavailableError, CategoryNotEmptyError, fromErrorCode, toActionResult, ValidationError } from "@/errors"

describe("fromErrorCode", () => {
  it("carries code and status of the matched class", () => {
    const error = fromErrorCode("CATEGORY_NOT_EMPTY", "У категорії ще 6 позицій")

    expect(error).toBeInstanceOf(CategoryNotEmptyError)
    expect(error.status).toBe(409)
    expect(error.name).toBe("CategoryNotEmptyError")
  })

  it("falls back to a readable message when the API sends none", () => {
    expect(fromErrorCode("STORAGE_ERROR", "   ").message.length).toBeGreaterThan(0)
  })
})

describe("contextual constructors", () => {
  it("names the category and counts its items", () => {
    expect(CategoryNotEmptyError.forCategory("Шоти", 6).message).toBe(
      'У категорії "Шоти" ще 6 позицій. Перенесіть або видаліть їх спочатку'
    )
  })
})

describe("toActionResult", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("passes field errors through to the form", () => {
    const result = toActionResult(new ValidationError("Перевірте поля", { slug: "Такий slug зайнятий" }))

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Перевірте поля",
      fieldErrors: { slug: "Такий slug зайнятий" },
    })
  })

  it("omits field errors when details are not per-field", () => {
    const result = toActionResult(new ApiUnavailableError("Сервер мовчить", { status: 503 }))

    expect(result.fieldErrors).toBeUndefined()
    expect(result.code).toBe("API_UNAVAILABLE")
  })

  it("never leaks an unexpected error to the user", () => {
    const result = toActionResult(new Error("ECONNRESET at line 42"))

    expect(result.code).toBe("UNKNOWN")
    expect(result.message).not.toContain("ECONNRESET")
  })
})
