import { test, expect } from "@playwright/test";
import { examples } from "../src/lib/examples";
import photos from "./fixtures/kansai-photos.json";
import fs from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/maps-config", (route) =>
    route.fulfill({ json: { key: "test-embed-key" } }),
  );
  await page.route("https://www.google.com/maps/embed/**", (route) =>
    route.fulfill({
      body: "<html lang=ko>지도 테스트</html>",
      contentType: "text/html",
    }),
  );
});
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
    activities: trip.days[0].activities.slice(0, 2).map((a, j) => ({
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
  await page
    .getByRole("button", { name: new RegExp(trip.title + " 2027") })
    .click();
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
  await expect(page.locator("iframe.route-map")).toBeVisible();
  await expect(page.locator("iframe.route-map")).toHaveAttribute(
    "src",
    /language=ko/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "가이드북 맨 위로 이동" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
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
    await page.setViewportSize({
      width: info.project.name === "mobile" ? 390 : 1440,
      height: 1800,
    });
    await page.screenshot({
      path: `screenshots/2026-11-25-guidebook/${info.project.name}.png`,
    });
  }
});

test("문장형 일정에서 기준 장소와 미정 장소를 구분한다", async ({ page }) => {
  const trip = structuredClone(examples[0]);
  trip.title = "문장형 일정 동선 검증";
  const base = trip.days[0].activities[0];
  trip.days[0].city = "오사카";
  trip.days[0].activities = [
    {
      ...base,
      id: "reference-hotel",
      title: "후쿠시마역 주변 숙소 체크인·휴식",
      kind: "숙박",
    },
    {
      ...base,
      id: "reference-walk",
      title: "후쿠시마역 고가에서 옆 골목으로",
      kind: "관광",
    },
    {
      ...base,
      id: "unresolved-meal",
      title: "동네 가게에서 도테야키로 저녁 시작",
      kind: "식사",
    },
  ];
  trip.visuals = { photos, places: [] };
  await page.addInitScript(
    (t) => localStorage.setItem("travel-books-v1", JSON.stringify([t])),
    trip,
  );
  await page.route("**/api/place-media", async (route) => {
    const body = route.request().postDataJSON();
    if (!body.route) {
      await route.fulfill({ json: { candidates: [] } });
      return;
    }
    expect(body.query).not.toMatch(/^오사카 /);
    await route.fulfill({
      json: {
        candidates: body.query.includes("후쿠시마역")
          ? [
              {
                title: "후쿠시마역 (한신 전기철도)",
                lat: 34.69611111,
                lon: 135.48833333,
                sourceUrl: "https://ko.wikipedia.org/wiki/Test",
              },
            ]
          : [],
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await page
    .getByRole("button", { name: new RegExp(trip.title + " ") })
    .filter({ hasNotText: "삭제" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "지도에서 동선 보기" })
    .first()
    .click();
  await expect(page.locator("iframe.route-map")).toBeVisible();
  await expect(page.locator("iframe.route-map")).toHaveAttribute(
    "src",
    /embed\/v1\/view/,
  );
  await expect(
    page.getByText("1번 · 후쿠시마역 (한신 전기철도) — 주변 탐색 기준점"),
  ).toBeVisible();
  await expect(page.getByText(/위치 미정: 동네 가게에서/)).toBeVisible();
  await expect(page.getByText(/2개 일정의 기준 장소/)).toBeVisible();
});
