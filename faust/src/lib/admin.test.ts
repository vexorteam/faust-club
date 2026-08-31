import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CategoryNotEmptyError, UnauthorizedError } from "@/errors"

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))

const { createItem, deleteCategory, listCategories, listItemGroups, moveItem, updateItem } = await import("@/lib/admin")

const user = { id: "9f3a", name: "Власник", email: "owner@faust.bar" }

const category = {
  id: "cat-1",
  slug: "shots",
  label: "Шоти",
  note: null,
  order: 2,
  visible: true,
  itemsCount: 6,
}

const item = {
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
}

type Route = { body: unknown; status?: number; headers?: Record<string, string> }

const apiRoutes = (routes: Record<string, Route>) => {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const path = String(url).replace("http://api.test", "")
    const key = `${init?.method ?? "GET"} ${path}`
    const route = routes[key]

    if (!route) {
      return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: `немає ${key}` } }), { status: 404 })
    }

    return new Response(JSON.stringify(route.body), { status: route.status ?? 200, headers: route.headers })
  })

  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

const ME = "GET /api/v1/auth/me"

const signedIn = () => cookieStore.get.mockReturnValue({ value: "jwt-token" })

describe("admin api", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test")
    vi.spyOn(console, "error").mockImplementation(() => {})
    cookieStore.get.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("refuses to act without a session and never reaches the API", async () => {
    const fetchMock = apiRoutes({ [ME]: { body: { user } } })

    await expect(listCategories()).rejects.toBeInstanceOf(UnauthorizedError)
    await expect(createItem({ ...item, description: null, volume: null })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refuses to act when the API says the token is dead", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { error: { code: "UNAUTHORIZED", message: "Термін дії токена вичерпано" } }, status: 401 },
    })

    await expect(listCategories()).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it("sends the session token as a bearer on every admin call", async () => {
    signedIn()
    const fetchMock = apiRoutes({
      [ME]: { body: { user } },
      "GET /api/v1/admin/categories": { body: { categories: [category] } },
    })

    await expect(listCategories()).resolves.toEqual([category])

    const call = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit]
    expect(call[0]).toBe("http://api.test/api/v1/admin/categories")
    expect((call[1].headers as Record<string, string>).authorization).toBe("Bearer jwt-token")
  })

  it("never caches admin data, so two devices cannot see different menus", async () => {
    signedIn()
    const fetchMock = apiRoutes({
      [ME]: { body: { user } },
      "GET /api/v1/admin/items": { body: { categories: [] } },
    })

    await listItemGroups()

    const call = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit & { cache?: string }]
    expect(call[1].cache).toBe("no-store")
  })

  it("moves an item at the edge of the list without treating it as an error", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "POST /api/v1/admin/items/item-1/move": { body: { ok: true } },
    })

    await expect(moveItem("item-1", "up")).resolves.toBeUndefined()
  })

  it("saves a single field as a patch, the way the availability switch does", async () => {
    signedIn()
    const fetchMock = apiRoutes({
      [ME]: { body: { user } },
      "PATCH /api/v1/admin/items/item-1": { body: { item: { ...item, available: false } } },
    })

    await expect(updateItem("item-1", { available: false })).resolves.toMatchObject({ available: false })

    const call = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit]
    expect(call[1].body).toBe(JSON.stringify({ available: false }))
  })

  it("explains a category that refuses to be deleted, with the count", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "DELETE /api/v1/admin/categories/cat-1": {
        body: { error: { code: "CATEGORY_NOT_EMPTY", message: "Category is not empty" } },
        status: 409,
      },
      "GET /api/v1/admin/categories": { body: { categories: [category] } },
    })

    await expect(deleteCategory("cat-1")).rejects.toThrow(
      'У категорії "Шоти" ще 6 позицій. Перенесіть або видаліть їх спочатку'
    )
  })

  it("counts in Ukrainian, so a single leftover item does not read as «1 позицій»", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "DELETE /api/v1/admin/categories/cat-1": {
        body: { error: { code: "CATEGORY_NOT_EMPTY", message: "Category is not empty" } },
        status: 409,
      },
      "GET /api/v1/admin/categories": { body: { categories: [{ ...category, itemsCount: 1 }] } },
    })

    await expect(deleteCategory("cat-1")).rejects.toThrow('У категорії "Шоти" ще 1 позиція.')
  })

  it("keeps the API's own wording when it cannot look the category up", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "DELETE /api/v1/admin/categories/cat-1": {
        body: { error: { code: "CATEGORY_NOT_EMPTY", message: "У категорії ще є позиції" } },
        status: 409,
      },
      "GET /api/v1/admin/categories": { body: { categories: [] } },
    })

    const failure = await deleteCategory("cat-1").catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CategoryNotEmptyError)
    expect((failure as CategoryNotEmptyError).message).toBe("У категорії ще є позиції")
  })
  it("rewrites the session cookie when a write comes back with a renewed token", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "PATCH /api/v1/admin/items/item-1": {
        body: { item: { ...item, price: 555 } },
        headers: { "x-session-token": "fresh-jwt", "x-session-expires-in": "604800" },
      },
    })

    await updateItem("item-1", { price: 555 })

    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ value: "fresh-jwt", maxAge: 604800, httpOnly: true })
    )
  })

  it("leaves the cookie alone on the days the API renews nothing", async () => {
    signedIn()
    apiRoutes({
      [ME]: { body: { user } },
      "PATCH /api/v1/admin/items/item-1": { body: { item: { ...item, price: 555 } } },
    })

    await updateItem("item-1", { price: 555 })

    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})
