import { afterEach, expect, it, vi } from "vitest";
import { findRoutePlace } from "../src/lib/place-media";

afterEach(() => vi.unstubAllGlobals());
function fixture(
  placeTitle = "Funaoka Onsen",
  lat = 35.039,
  license = "CC BY 3.0",
) {
  return vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input));
    const q = url.searchParams.get("gsrsearch");
    let pages: unknown[] = [];
    if (url.hostname === "commons.wikimedia.org") {
      pages = [
        {
          imageinfo: [
            {
              thumburl: "https://upload.wikimedia.org/test.jpg",
              descriptionurl:
                "https://commons.wikimedia.org/wiki/File:Test.jpg",
              extmetadata: {
                LicenseShortName: { value: license },
                LicenseUrl: {
                  value: "https://creativecommons.org/licenses/by/3.0/",
                },
                Artist: { value: "Photographer" },
              },
            },
          ],
        },
      ];
    } else if (q === "교토") {
      pages = [
        {
          title: "교토시",
          index: 1,
          fullurl: "https://ko.wikipedia.org/wiki/교토시",
          coordinates: [{ lat: 35.01, lon: 135.76, globe: "earth" }],
        },
      ];
    } else if (url.hostname === "en.wikipedia.org" && q === "Funaoka Onsen") {
      pages = [
        {
          title: placeTitle,
          index: 1,
          fullurl: "https://en.wikipedia.org/wiki/Funaoka_Onsen",
          pageimage: "Test.jpg",
          coordinates: [{ lat, lon: 135.74, globe: "earth" }],
        },
      ];
    }
    return new Response(JSON.stringify({ query: { pages } }));
  });
}
it("falls back to an English canonical name without forcing the Korean wiki", async () => {
  const fetcher = fixture();
  vi.stubGlobal("fetch", fetcher);
  const result = await findRoutePlace(
    "후나오카 온천",
    "교토",
    undefined,
    true,
    ["Funaoka Onsen"],
  );
  expect(result[0].photo?.credit).toBe("Photographer");
  expect(result[0].title).toBe("Funaoka Onsen");
  expect(
    fetcher.mock.calls.some(([url]) =>
      String(url).includes("en.wikipedia.org"),
    ),
  ).toBe(true);
});
it("rejects another place or a distant homonym even if it has a photo", async () => {
  for (const [title, lat] of [
    ["Funaoka Station", 35.039],
    ["Funaoka Onsen", 40],
  ] as const) {
    vi.stubGlobal("fetch", fixture(title, lat));
    expect(
      await findRoutePlace("후나오카 온천", "교토", undefined, true, [
        "Funaoka Onsen",
      ]),
    ).toEqual([]);
  }
});
it("never attaches an image with unsupported reuse terms", async () => {
  vi.stubGlobal(
    "fetch",
    fixture("Funaoka Onsen", 35.039, "All rights reserved"),
  );
  const result = await findRoutePlace(
    "후나오카 온천",
    "교토",
    undefined,
    true,
    ["Funaoka Onsen"],
  );
  expect(result[0].photo).toBeUndefined();
});
