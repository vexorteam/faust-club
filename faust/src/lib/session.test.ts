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

const {
  applySessionRenewal,
  getSession,
  redirectIfSignedIn,
  requireAdmin,
  requireAdminOrRedirect,
  setSessionCookie,
  clearSessionCookie,
} = await import("@/lib/session");

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
  it("rewrites the cookie with the token the API renewed", async () => {
    await expect(applySessionRenewal({ token: "fresh-jwt", expiresIn: 604800 })).resolves.toBe(true);

    expect(cookieStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ value: "fresh-jwt", maxAge: 604800, httpOnly: true }),
    );
  });

  it("does nothing when there was no renewal to apply", async () => {
    await expect(applySessionRenewal(null)).resolves.toBe(false);

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("drops a renewal that arrives where cookies are read-only, instead of failing the page", async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });

    await expect(applySessionRenewal({ token: "fresh-jwt", expiresIn: 604800 })).resolves.toBe(false);
  });

  it("redirectIfSignedIn sends a live session to the panel", async () => {
    signedInWith("jwt-token");
    apiAnswers({ user });

    await expect(redirectIfSignedIn()).rejects.toThrow("NEXT_REDIRECT:/admin");
  });

  it("redirectIfSignedIn leaves an expired cookie on the login form", async () => {
    // The loop this closes: the panel sends a dead token here, and anything
    // that sent it back would keep the two pages throwing it at each other.
    signedInWith("stale-token");
    apiAnswers({ error: { code: "UNAUTHORIZED", message: "Сесія недійсна" } }, 401);

    await expect(redirectIfSignedIn()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirectIfSignedIn keeps the form on screen when the API is unreachable", async () => {
    signedInWith("jwt-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(redirectIfSignedIn()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
