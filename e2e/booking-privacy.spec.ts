import { test, expect } from "@playwright/test";

test("예약번호가 표시된 입력은 브라우저에서 전송을 막고 지우면 재시도할 수 있다", async ({ page }) => {
  const payloads: unknown[] = [];
  await page.route("**/api/agent", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, json: { error: "테스트용 응답: 전송 확인" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page.getByLabel("API 키", { exact: true }).fill("test-only-privacy-key");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("여행 시작일").fill("2027-01-10");
  await page.getByLabel("여행 종료일").fill("2027-01-10");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "다음 단계" }).click();
  const notes = page.getByLabel("추가 예약 메모·꼭 지킬 조건");
  await notes.fill("예약번호: SECRET123");
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await expect(page.getByText("예약번호로 보이는 내용이 있습니다.", { exact: false })).toBeVisible();
  expect(payloads).toHaveLength(0);
  await expect(notes).toHaveValue("예약번호: SECRET123");
  await notes.fill("10시 미술관 입장");
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await expect(page.getByText("테스트용 응답: 전송 확인")).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(JSON.stringify(payloads)).not.toContain("SECRET123");
});
