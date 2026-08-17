import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The upload route: what leaves the browser as multipart and what the owner is
 * told when it does not arrive.
 */

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const { POST, DELETE } = await import("@/app/api/admin/items/[id]/image/route");

const user = { id: "9f3a", name: "Власник", email: "owner@faust.bar" };

const params = Promise.resolve({ id: "item-1" });

const photo = (size = 1024, type = "image/jpeg") => new File([new Uint8Array(size)], "IMG_0421.jpg", { type });

const upload = (form: FormData) =>
  POST(new Request("http://localhost/api/admin/items/item-1/image", { method: "POST", body: form }), { params });

const withPhoto = (file: File, alt = "Коктейль Faust Sour у келиху купе") => {
  const form = new FormData();

  form.set("file", file);
  form.set("alt", alt);

  return form;
};

const apiAnswers = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async (url: string | URL) =>
    String(url).endsWith("/auth/me")
      ? new Response(JSON.stringify({ user }), { status: 200 })
      : new Response(JSON.stringify(body), { status }),
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
};

const stored = { image: "https://media.faust.bar/menu/9f3a-card.webp", imageAlt: "Коктейль Faust Sour у келиху купе" };

describe("POST /api/admin/items/[id]/image", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    cookieStore.get.mockReturnValue({ value: "jwt-token" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("sends the file on as multipart and answers with the stored photo", async () => {
    const fetchMock = apiAnswers(stored);

    const response = await upload(withPhoto(photo()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: stored });

    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/admin/items/item-1/image");
    expect(init.body).toBeInstanceOf(FormData);
    /** The boundary is the browser's to write — a content type of ours would break it */
    expect((init.headers as Record<string, string>)["content-type"]).toBeUndefined();
  });

  it("refuses an oversized frame without spending the upload on the API", async () => {
    const fetchMock = apiAnswers(stored);

    const response = await upload(withPhoto(photo(6 * 1024 * 1024)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { file: "Файл 6.0 МБ. Максимум — 5 МБ" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not let a photo through undescribed", async () => {
    const fetchMock = apiAnswers(stored);

    const response = await upload(withPhoto(photo(), "бар"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      fieldErrors: { alt: expect.stringContaining("Опис фото") },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repeats the API's own refusal in human words", async () => {
    apiAnswers({ error: { code: "UNSUPPORTED_FILE", message: "Це не зображення. Візьміть JPEG або PNG" } }, 415);

    const response = await upload(withPhoto(photo()));

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "UNSUPPORTED_FILE",
      message: "Це не зображення. Візьміть JPEG або PNG",
    });
  });

  it("sends a signed-out owner to the login form instead of uploading", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const fetchMock = apiAnswers(stored);

    const response = await upload(withPhoto(photo()));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the photo and leaves the position in the menu", async () => {
    const fetchMock = apiAnswers({ ok: true });

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params });

    expect(response.status).toBe(200);

    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/admin/items/item-1/image");
    expect(init.method).toBe("DELETE");
  });
});
