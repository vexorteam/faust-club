import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))

const { POST } = await import("@/app/api/auth/login/route")

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  )

const apiAnswers = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

const credentials = { email: "owner@faust.bar", password: "nightshift" }

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test")
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("keeps the token out of the response body and puts it in the cookie", async () => {
    apiAnswers({
      access_token: "jwt-token",
      expires_in: 604800,
      user: { id: "9f3a", name: "Власник", email: "owner@faust.bar" },
    })

    const response = await post(credentials)
    const body = JSON.stringify(await response.json())

    expect(response.status).toBe(200)
    expect(body).not.toContain("jwt-token")
    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "faust_session", value: "jwt-token", httpOnly: true })
    )
  })

  it("never reveals whether the address exists", async () => {
    apiAnswers({ error: { code: "INVALID_CREDENTIALS", message: "Адміністратора з такою поштою не знайдено" } }, 401)

    const response = await post(credentials)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "Невірна пошта або пароль",
    })
  })

  it("rejects a short password without calling the API", async () => {
    const fetchMock = apiAnswers({ ok: true })

    const response = await post({ email: "owner@faust.bar", password: "short" })

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it("passes a rate limit on with the API's own wording", async () => {
    apiAnswers({ error: { code: "RATE_LIMITED", message: "Забагато спроб. Спробуйте за 10 хвилин" } }, 429)

    const response = await post(credentials)

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      message: "Забагато спроб. Спробуйте за 10 хвилин",
    })
  })

  it("does not set a cookie when the backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed")
      })
    )

    const response = await post(credentials)

    expect(response.status).toBe(503)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it("passes the visitor's address on so the attempt limit counts them, not us", async () => {
    const fetchMock = apiAnswers({
      access_token: "jwt-token",
      expires_in: 604800,
      user: { id: "9f3a", name: "Власник", email: "owner@faust.bar" },
    })

    await post(credentials, { "x-forwarded-for": "203.0.113.7, 172.28.0.4" })

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]

    expect((request.headers as Record<string, string>)["x-forwarded-for"]).toBe("203.0.113.7, 172.28.0.4")
  })

  it("sends no address header when nothing proxied the request", async () => {
    const fetchMock = apiAnswers({
      access_token: "jwt-token",
      expires_in: 604800,
      user: { id: "9f3a", name: "Власник", email: "owner@faust.bar" },
    })

    await post(credentials)

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]

    expect(request.headers as Record<string, string>).not.toHaveProperty("x-forwarded-for")
  })
})
