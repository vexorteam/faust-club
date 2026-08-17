import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAtmospherePhotos } from "@/lib/atmosphere";

/**
 * The home page grid now belongs to the owner. What matters here is that a bad
 * record cannot take the section down, and a missing backend cannot take the
 * page down.
 */

const photo = {
  id: "3c1f",
  label: "Танцпол",
  image: "https://media.faust.bar/atmosphere/3c1f-card.webp",
  imageAlt: "Танцпол Faust під час нічного сету",
};

const apiAnswers = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
};

describe("atmosphere feed", () => {
  beforeEach(() => {
    vi.stubEnv("MENU_API_URL", "http://api.test");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("keeps the order the API sent, because sorting is its job", async () => {
    apiAnswers({ photos: [photo, { ...photo, id: "7ab2", label: "Бар" }] });

    await expect(getAtmospherePhotos()).resolves.toEqual([photo, { ...photo, id: "7ab2", label: "Бар" }]);
  });

  it("drops a tile with no description and shows the rest", async () => {
    apiAnswers({ photos: [{ id: "bad", label: "Бар", image: photo.image }, photo] });

    await expect(getAtmospherePhotos()).resolves.toEqual([photo]);
  });

  it("drops a tile whose picture is not a URL", async () => {
    apiAnswers({ photos: [{ ...photo, id: "bad", image: "atmosphere/3c1f.webp" }] });

    await expect(getAtmospherePhotos()).resolves.toEqual([]);
  });

  it("caches under its own tag, so a new photo does not invalidate the menu", async () => {
    const fetchMock = apiAnswers({ photos: [photo] });

    await getAtmospherePhotos();

    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, { next?: { tags?: string[] } }];
    expect(url).toBe("http://api.test/api/v1/atmosphere");
    expect(init.next?.tags).toEqual(["atmosphere"]);
  });

  it("answers with no photos when the API is down, instead of failing the page", async () => {
    apiAnswers({ error: { code: "DATABASE_ERROR", message: "База недоступна" } }, 500);

    await expect(getAtmospherePhotos()).resolves.toEqual([]);
  });
});
