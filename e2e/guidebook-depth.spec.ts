import { test, expect } from "@playwright/test";
import { examples } from "../src/lib/examples";
import photos from "./fixtures/kansai-photos.json";

test("place chapters and dining tabs retain photos, details and keyboard navigation", async ({
  page,
}) => {
  const trip = structuredClone(examples[0]);
  const a = trip.days[0].activities[0];
  trip.sources = [
    {
      id: "fixture",
      title: "테스트 근거",
      url: "https://example.com/evidence",
      provider: "예시",
      checkedAt: "2026-11-26",
    },
  ];
  trip.placeGuides = [
    {
      activityId: a.id,
      activityTitle: a.title,
      name: a.title,
      introduction: "장소 소개 테스트",
      background: "역사적 배경 테스트",
      highlights: ["지붕의 형태를 살펴보세요"],
      visitTip: "관람 팁 테스트",
      sourceIds: ["fixture"],
    },
  ];
  trip.visuals = {
    photos: [
      {
        ...photos[0],
        city: trip.days[0].city,
        activityId: a.id,
        activityTitle: a.title,
      },
    ],
    places: [],
  };
  trip.recommendations = [
    {
      kind: "식당",
      category: "이자카야",
      city: trip.days[0].city,
      name: "테스트 음식점",
      reason: "동선과 취향 비교",
      specialty: "테스트 특색",
      atmosphere: "테스트 분위기",
      menu: [{ name: "테스트 메뉴", description: "메뉴 설명 테스트" }],
      tradeoff: "예약 여부 확인",
      checks: ["당일 영업 확인"],
      sourceIds: ["fixture"],
    },
  ];
  await page.addInitScript(
    (t) => localStorage.setItem("travel-books-v1", JSON.stringify([t])),
    trip,
  );
  await page.route("**/api/place-media", (route) =>
    route.fulfill({ json: { candidates: [] } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await page
    .getByRole("button", { name: new RegExp(`${trip.title}.*버전`) })
    .click();
  await expect(
    page.locator(".book-activity .destination-photo img").first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "장소 해설", exact: true }).click();
  await expect(
    page.getByText("장소 소개 테스트", { exact: true }),
  ).toBeVisible();
  await page.getByText("역사와 문화적 배경 읽기", { exact: true }).click();
  await expect(
    page.getByText("역사적 배경 테스트", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "장소 해설", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "맛집·술집", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("메뉴 설명 테스트", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("장소 소개 테스트", { exact: true }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
