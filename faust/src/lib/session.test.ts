import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiUnavailableError, UnauthorizedError } from "@/errors";

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
  delete: vi.fn(),
};

const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

const { getSession, requireAdmin, requireAdminOrRedirect, setSessionCookie, clearSessionCookie } =
  await import("@/lib/session");

const user = { id: "9f3a", name: "Власник", email: "owner@faust.bar" };

const signedInWith = (token: string) => cookieStore.get.mockReturnValue({ value: token });

const apiAnswers = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
};

describe("session", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    cookieStore.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("reports nobody signed in when there is no cookie, without asking the API", async () => {
    const fetchMock = apiAnswers({ user });

    await expect(getSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the token as a bearer and returns the user the API confirms", async () => {
    signedInWith("jwt-token");
    const fetchMock = apiAnswers({ user });

    await expect(getSession()).resolves.toEqual(user);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/auth/me");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer jwt-token");
  });

  it("treats an expired token as no session at all", async () => {
    signedInWith("stale-token");
    apiAnswers({ error: { code: "UNAUTHORIZED", message: "Термін дії токена вичерпано" } }, 401);

    await expect(getSession()).resolves.toBeNull();
  });

  it("does not sign the owner out just because the API is down", async () => {
    signedInWith("jwt-token");
    apiAnswers("<html>bad gateway</html>", 502);

    await expect(getSession()).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("requireAdmin throws instead of quietly returning null", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireAdmin returns the user when the session is alive", async () => {
    signedInWith("jwt-token");
    apiAnswers({ user });

    await expect(requireAdmin()).resolves.toEqual(user);
  });

  it("requireAdminOrRedirect sends a signed-out visitor to the login form", async () => {
    await expect(requireAdminOrRedirect()).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("requireAdminOrRedirect does not redirect when the API is unreachable", async () => {
    signedInWith("jwt-token");
    apiAnswers("<html>bad gateway</html>", 502);

    await expect(requireAdminOrRedirect()).rejects.toBeInstanceOf(ApiUnavailableError);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("stores the token in a cookie the browser cannot read", async () => {
    await setSessionCookie("jwt-token", 604800);

    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "faust_session",
        value: "jwt-token",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      }),
    );
  });

  it("drops the cookie on sign-out", async () => {
    await clearSessionCookie();

    expect(cookieStore.delete).toHaveBeenCalledWith("faust_session");
  });
});
