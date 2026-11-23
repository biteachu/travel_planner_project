import { test, expect } from "@playwright/test";

test("키 확인 성공·관리·변경·실패·해제·새로고침 상태를 구분한다", async ({
  page,
}) => {
  let accepted = true;
  await page.route("**/api/agent", (route) =>
    route.fulfill(
      accepted
        ? { json: { connected: true } }
        : { status: 502, json: { error: "키 권한을 확인해 주세요." } },
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page.getByLabel("API 키", { exact: true }).fill("test-only-status-key");
  await expect(
    page.getByRole("button", { name: "API 키 연결 완료", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "연결 확인", exact: true }).click();
  const connected = page.getByRole("button", {
    name: "API 키 연결 완료",
    exact: true,
  });
  await expect(connected).toHaveClass(/key-connected/);
  await connected.click();
  await expect(page.getByRole("dialog")).toContainText(
    "다시 입력하실 필요가 없습니다",
  );
  await expect(page.getByLabel("API 키", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "키 변경", exact: true }).click();
  await expect(connected).toHaveCount(0);
  accepted = false;
  await page.getByRole("button", { name: "연결 확인", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "키 권한을 확인해 주세요.",
  );
  await expect(connected).toHaveCount(0);
  accepted = true;
  await page.getByRole("button", { name: "연결 확인", exact: true }).click();
  await connected.click();
  await page.getByRole("button", { name: "연결 해제", exact: true }).click();
  await expect(page.getByLabel("API 키", { exact: true })).toHaveValue("");
  await expect(connected).toHaveCount(0);
  await page.getByLabel("API 키", { exact: true }).fill("test-only-status-key");
  await page.getByRole("button", { name: "연결 확인", exact: true }).click();
  await expect(connected).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "API 키 설정", exact: true }),
  ).toBeVisible();
  await expect(connected).toHaveCount(0);
});
