import { test, expect } from "@playwright/test";
import { examples } from "../src/lib/examples";
import photos from "./fixtures/kansai-photos.json";
import fs from "node:fs/promises";
test("사진·접힌 확인 사항·날짜별 지도·맨 위로를 제공한다", async ({
  page,
}, info) => {
  const trip = structuredClone(examples[0]);
  trip.title = "오사카의 활기, 교토의 느린 풍경";
  trip.brief.startDate = "2027-04-01";
  trip.brief.endDate = "2027-04-05";
  trip.summary =
    "도시의 활기와 고도의 여유를 번갈아 즐기는 4박 5일 여행입니다.";
  trip.bases = [
    { city: "오사카", nights: 2, neighborhood: "도심", reason: "도심 산책" },
    { city: "교토", nights: 2, neighborhood: "도심", reason: "고도 산책" },
  ];
  trip.days = Array.from({ length: 5 }, (_, i) => ({
    ...structuredClone(trip.days[0]),
    date: `2027-04-${String(i + 1).padStart(2, "0")}`,
    city: i < 2 ? "오사카" : "교토",
    title: i < 2 ? "도시의 풍경과 골목 산책" : "고도의 정원과 느린 산책",
    activities: trip.days[0].activities
      .slice(0, 2)
      .map((a, j) => ({
        ...a,
        id: `d${i}a${j}`,
        title:
          i < 2 ? (j ? "도톤보리" : "오사카성") : j ? "기요미즈데라" : "금각사",
        kind: "관광" as const,
        description:
          "여행지의 풍경과 주변 골목을 천천히 둘러보는 시간입니다. ".repeat(6),
        sourceIds: [],
      })),
  }));
  trip.warnings = [
    "출발 전 운영 시간과 휴무일을 공식 안내에서 확인해 주세요. ".repeat(30),
  ];
  trip.visuals = { photos, places: [] };
  await page.addInitScript(
    (t) => localStorage.setItem("travel-books-v1", JSON.stringify([t])),
    trip,
  );
  await page.route("**/api/place-media", async (route) => {
    const body = route.request().postDataJSON();
    const title = body.query.includes("도톤보리") ? "도톤보리" : "오사카성";
    await route.fulfill({
      json: {
        candidates: [
          {
            title,
            lat: title === "도톤보리" ? 34.6687 : 34.6873,
            lon: title === "도톤보리" ? 135.5013 : 135.5258,
            sourceUrl:
              "https://ko.wikipedia.org/wiki/" + encodeURIComponent(title),
          },
        ],
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(trip.title + " 2027") }).click();
  await page.getByRole("button", { name: "가이드북", exact: true }).click();
  const book = page.locator(".guidebook");
  await expect(book.locator(".book-photo-spread img")).toHaveCount(2);
  await expect(book.locator(".warning-drawer")).not.toHaveAttribute("open", "");
  await book.locator(".warning-drawer summary").click();
  await expect(book.locator(".warning-drawer li")).toBeVisible();
  await book.locator(".warning-drawer summary").click();
  await page
    .getByRole("button", { name: "지도에서 동선 보기" })
    .first()
    .click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "가이드북 맨 위로 이동" }).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeLessThan(5);
  if (process.env.CAPTURE_GUIDEBOOK) {
    await expect
      .poll(() =>
        book
          .locator(".book-photo-spread img")
          .evaluateAll((imgs) =>
            imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);
    await fs.mkdir("screenshots/2026-11-25-guidebook", { recursive: true });
    await page.setViewportSize({width: info.project.name === "mobile" ? 390 : 1440, height: 1800});
    await page.screenshot({
      path: `screenshots/2026-11-25-guidebook/${info.project.name}.png`,
    });
  }
});



