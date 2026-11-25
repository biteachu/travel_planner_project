import { test, expect } from "@playwright/test";

test("사진 등장과 동작 줄이기, 작은 화면 레이아웃을 확인한다", async ({
  page,
}) => {
  await page.goto("/");
  const photos = page.locator(".world-photo");
  await expect(photos).toHaveCount(3);
  await expect(photos.first()).toHaveCSS(
    "animation-name",
    "travel-photo-arrive",
  );
  await expect(photos.nth(2)).toHaveCSS("animation-delay", "0.22s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(photos.first()).toHaveCSS("animation-name", "none");
  await expect(photos.first()).toHaveCSS("opacity", "1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("ChatGPT 연결 상태와 모델을 표시하고 구독 오류 시 API로 넘어가지 않는다", async ({
  page,
}) => {
  let claudeCalls = 0;
  let subscriptionCalls = 0;
  await page.route("**/api/agent", async (route) => {
    claudeCalls++;
    await route.fulfill({ status: 500, json: {} });
  });
  await page.route("**/api/chatgpt/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        connected: true,
        model: "test-model",
        active: "test-account",
        accounts: [
          { id: "test-account", label: "테스트 계정", connected: true },
        ],
      },
    }),
  );
  await page.route("**/api/chatgpt/models", (route) =>
    route.fulfill({
      json: { models: [{ id: "test-model", name: "테스트 모델" }] },
    }),
  );
  await page.route("**/api/chatgpt/agent", (route) => {
    subscriptionCalls++;
    return route.fulfill({
      status: 429,
      json: {
        error:
          "ChatGPT 사용 한도에 도달했습니다. 유료 API로 전환하지 않았습니다.",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "ChatGPT 구독 연결됨", exact: true })
    .click();
  await expect(page.getByLabel("여행 계획에 사용할 모델")).toHaveValue(
    "test-model",
  );
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: "내 여행책 만들기", exact: true })
    .click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("가고 싶은 도시").fill("도쿄");
  await page.getByLabel("여행 시작일").fill("2026-12-01");
  await page.getByLabel("여행 종료일").fill("2026-12-01");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "유료 API로 전환하지 않았습니다",
  );
  expect(subscriptionCalls).toBe(1);
  expect(claudeCalls).toBe(0);
});
