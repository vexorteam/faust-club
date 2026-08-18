import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import { ApiUnavailableError, CategoryNotEmptyError, RateLimitError, UnauthorizedError } from "@/errors";

const schema = z.object({ ok: z.boolean() });

const respondWith = (body: unknown, status = 200) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })),
  );
};

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test/");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the parsed body on success", async () => {
    respondWith({ ok: true });

    await expect(apiRequest("/api/v1/menu", schema)).resolves.toEqual({ ok: true });
  });

  it("strips the trailing slash off the base url", async () => {
    let requestedUrl: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        requestedUrl = input;

        return new Response(JSON.stringify({ ok: true }));
      }),
    );

    await apiRequest("/api/v1/menu", schema);

    expect(requestedUrl).toBe("http://api.test/api/v1/menu");
  });

  it("sends a bearer token and a JSON body when asked to", async () => {
    let init: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, received: RequestInit) => {
        init = received;

        return new Response(JSON.stringify({ ok: true }));
      }),
    );

    await apiRequest("/api/v1/auth/logout", schema, {
      method: "POST",
      body: { reason: "manual" },
      token: "jwt-token",
    });

    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"reason":"manual"}');
    expect(init?.headers).toMatchObject({
      authorization: "Bearer jwt-token",
      "content-type": "application/json",
    });
  });

  it("stays a plain GET with no authorization header by default", async () => {
    let init: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, received: RequestInit) => {
        init = received;

        return new Response(JSON.stringify({ ok: true }));
      }),
    );

    await apiRequest("/api/v1/menu", schema);

    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(init?.headers).not.toHaveProperty("authorization");
  });

  it("maps a bare 500 to ApiUnavailableError, not a naked Error", async () => {
    respondWith("upstream exploded", 500);

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("maps an error envelope onto its typed class", async () => {
    respondWith(
      { error: { code: "CATEGORY_NOT_EMPTY", message: 'У категорії "Шоти" ще 6 позицій' } },
      409,
    );

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(CategoryNotEmptyError);
  });

  it("collapses INVALID_CREDENTIALS into UnauthorizedError", async () => {
    respondWith({ error: { code: "INVALID_CREDENTIALS", message: "Невірна пошта або пароль" } }, 401);

    await expect(apiRequest("/api/v1/auth/me", schema)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("keeps the human message coming from the API", async () => {
    respondWith({ error: { code: "RATE_LIMITED", message: "Забагато спроб. Спробуйте за 10 хвилин" } }, 429);

    await expect(apiRequest("/api/v1/auth/login", schema)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: "Забагато спроб. Спробуйте за 10 хвилин",
    });
    await expect(apiRequest("/api/v1/auth/login", schema)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("treats an unknown error code as an unavailable API", async () => {
    respondWith({ error: { code: "TEAPOT", message: "Я чайник" } }, 418);

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("treats an unreadable body as an unavailable API", async () => {
    respondWith("<html>gateway</html>");

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("treats a body that does not match the schema as an unavailable API", async () => {
    respondWith({ ok: "yes" });

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("treats a network failure as an unavailable API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it("hands over a renewed session token when the answer carries one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            headers: { "x-session-token": "fresh-jwt", "x-session-expires-in": "604800" },
          }),
      ),
    );

    const seen: unknown[] = [];
    await apiRequest("/api/v1/admin/items", schema, { onRenewal: (renewal) => seen.push(renewal) });

    expect(seen).toEqual([{ token: "fresh-jwt", expiresIn: 604800 }]);
  });

  it("says nothing about renewal on the six days the headers are absent", async () => {
    respondWith({ ok: true });

    const onRenewal = vi.fn();
    await apiRequest("/api/v1/admin/items", schema, { onRenewal });

    expect(onRenewal).not.toHaveBeenCalled();
  });

  it("ignores a renewal whose lifetime is not a usable number", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            headers: { "x-session-token": "fresh-jwt", "x-session-expires-in": "forever" },
          }),
      ),
    );

    const onRenewal = vi.fn();
    await apiRequest("/api/v1/admin/items", schema, { onRenewal });

    expect(onRenewal).not.toHaveBeenCalled();
  });

  it("fails loudly when MENU_API_URL is not configured", async () => {
    vi.stubEnv("MENU_API_URL", "");
    respondWith({ ok: true });

    await expect(apiRequest("/api/v1/menu", schema)).rejects.toBeInstanceOf(ApiUnavailableError);
  });
});
