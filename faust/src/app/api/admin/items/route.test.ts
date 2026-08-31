import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))

const { POST } = await import("@/app/api/admin/items/route")

const user = { id: "9f3a", name: "Власник", email: "owner@faust.bar" }

const item = {
  categoryId: "cat-1",
  name: "Негроні",
  description: "джин, кампарі, вермут",
  price: "280",
  volume: "90 мл",
  badge: "",
  available: true,
}

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/admin/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  )

const apiAnswers = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async (url: string | URL) =>
    String(url).endsWith("/auth/me")
      ? new Response(JSON.stringify({ user }), { status: 200 })
      : new Response(JSON.stringify(body), { status })
  )

  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

describe("POST /api/admin/items", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test")
    vi.spyOn(console, "error").mockImplementation(() => {})
    cookieStore.get.mockReturnValue({ value: "jwt-token" })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("reports a bad price under the field, without asking the API", async () => {
    const fetchMock = apiAnswers({ item })

    const response = await post({ ...item, price: "0" })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { price: "Ціна — від 1 до 99999 ₴" },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("sends a signed-out owner back to the login form instead of writing", async () => {
    cookieStore.get.mockReturnValue(undefined)
    const fetchMock = apiAnswers({ item })

    const response = await post(item)

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("passes a valid position on and answers with what was created", async () => {
    apiAnswers({
      item: {
        id: "item-1",
        categoryId: "cat-1",
        name: "Негроні",
        description: "джин, кампарі, вермут",
        price: 280,
        volume: "90 мл",
        image: null,
        imageAlt: null,
        badge: null,
        available: true,
        order: 1,
      },
    })

    const response = await post(item)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { id: "item-1", price: 280 } })
  })

  it("shows the API's own message when it rejects the write", async () => {
    apiAnswers({ error: { code: "SLUG_CONFLICT", message: "Позиція з такою назвою вже є" } }, 409)

    const response = await post(item)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: "Позиція з такою назвою вже є" })
  })
})
