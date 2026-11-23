import { test, expect } from "@playwright/test";

test("앱 설치 정보·아이콘·취소 후 안내", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "홈 화면에 추가", exact: true })
    .waitFor();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "앱 설치", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "설치를 취소했습니다" }),
  ).toBeVisible();
  await expect(page.locator("#install-help")).toContainText("Safari");
  await expect(
    page.getByRole("button", { name: "홈 화면에 추가", exact: true }),
  ).toBeVisible();
});

test("오프라인 안내와 개인 데이터 캐시 제외", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("test-only-private-key");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  const cached = await page.evaluate(async () => {
    const result = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys())
        result.push({
          url: req.url,
          body: await (await cache.match(req))!.text(),
        });
    }
    return result;
  });
  expect(cached.map((item) => new URL(item.url).pathname)).toEqual([
    "/offline.html",
  ]);
  expect(JSON.stringify(cached)).not.toContain("test-only-private-key");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "잠시 연결이 끊겼어요." }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "다시 연결하기" }).click();
  await expect(
    page.getByRole("button", { name: "API 키 설정", exact: true }),
  ).toBeVisible();
});
