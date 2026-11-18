import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("수동 환율로 비용을 계산하고 직접 수정하면 환산 기록을 해제한다", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  const card = page.locator(".edit-card").first();
  await card.getByText("다른 통화의 비용 환산", { exact: true }).click();
  await card.getByLabel("원래 금액", { exact: true }).fill("1000");
  await card.getByLabel("원래 통화", { exact: true }).selectOption("JPY");
  await card.getByLabel("1 JPY당 KRW", { exact: true }).fill("9.5");
  await card.getByLabel("환율 기준일", { exact: true }).fill("2026-11-18");
  await card.getByLabel("환율 출처", { exact: true }).fill("테스트용 환율");
  await card.getByRole("button", { name: "환산 금액 적용" }).click();
  await expect(page.getByLabel("활동 1 비용", { exact: true })).toHaveValue(
    "9500",
  );
  await page.getByRole("button", { name: "가이드북", exact: true }).click();
  await expect(page.getByText(/환산:.*테스트용 환율/)).toBeVisible();
  await expect(page.getByText(/현재 계산된 잔여 예산/)).toBeVisible();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page.getByLabel("활동 1 비용", { exact: true }).fill("2000");
  await expect(card.getByText(/환산 기록:/)).toHaveCount(0);
});
test("추가 답변이 기존 취향을 보존한 채 생성 요청에 전달된다", async ({
  page,
}) => {
  let researchBrief:
    { preferences: string; additionalAnswers: string } | undefined;
  await page.route("**/api/agent", async (route) => {
    const body = route.request().postDataJSON();
    if (body.stage === "outline")
      return route.fulfill({
        json: {
          result: {
            title: "여행",
            summary: "요약",
            bases: [
              {
                city: "히로시마",
                nights: 2,
                reason: "거점",
                neighborhood: "중심부",
              },
            ],
            questions: ["선호하는 시작 시간은?"],
          },
        },
      });
    researchBrief = body.payload.brief;
    await route.fulfill({ status: 502, json: { error: "검증용 중단" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("test-only-local-mock-key");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("여행 시작일").fill("2027-01-10");
  await page.getByLabel("여행 종료일").fill("2027-01-12");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page
    .getByLabel("나만의 취향", { exact: true })
    .fill("조용한 골목과 작은 카페");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await page.getByLabel("추가 답변").fill("오전 10시 이후 시작");
  await page
    .getByRole("button", { name: "이 구성으로 가이드북 만들기" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "검증용 중단" }),
  ).toBeVisible();
  expect(researchBrief).toMatchObject({
    preferences: "조용한 골목과 작은 카페",
    additionalAnswers: "오전 10시 이후 시작",
  });
});
test("확정 예약을 추가·복원하고 시간 충돌을 거절한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("여행 시작일").fill("2027-01-10");
  await page.getByLabel("여행 종료일").fill("2027-01-12");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByLabel("첫날 활동 시작 가능 시간").fill("14:00");
  await page.getByLabel("마지막 날 활동 종료 시간").fill("15:00");
  await page.getByLabel("확정 일정 이름", { exact: true }).fill("미술관 입장");
  await page.getByLabel("확정 일정 날짜", { exact: true }).fill("2027-01-11");
  await page
    .getByRole("button", { name: "확정 일정 추가", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "미술관 입장 확정 일정 삭제" }),
  ).toBeVisible();
  await page.getByLabel("확정 일정 이름", { exact: true }).fill("겹치는 예약");
  await page
    .getByRole("button", { name: "확정 일정 추가", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "확정 일정끼리" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await expect(page.getByLabel("첫날 활동 시작 가능 시간")).toHaveValue(
    "14:00",
  );
  await expect(page.getByLabel("마지막 날 활동 종료 시간")).toHaveValue(
    "15:00",
  );
  await expect(
    page.getByRole("button", { name: "미술관 입장 확정 일정 삭제" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "겹치는 예약 확정 일정 삭제" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "미술관 입장 확정 일정 삭제" })
    .click();
  await expect(
    page.getByRole("button", { name: "미술관 입장 확정 일정 삭제" }),
  ).toHaveCount(0);
});
test("체류 시간과 순서를 바꾸고 고정 일정은 보호한다", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  const firstTitle = await page
    .getByLabel("활동 1 이름", { exact: true })
    .inputValue();
  await page.getByLabel("활동 1 체류 시간", { exact: true }).fill("600");
  await expect(page.getByText(/시간이 겹칩니다/).first()).toBeVisible();
  await page.getByLabel("활동 1 뒤로", { exact: true }).click();
  await expect(page.getByLabel("활동 2 이름", { exact: true })).toHaveValue(
    firstTitle,
  );
  await expect(
    page.getByLabel("활동 2 체류 시간", { exact: true }),
  ).toHaveValue("600");
  await page
    .getByRole("button", { name: "일정 고정", exact: true })
    .nth(1)
    .click();
  await expect(
    page.getByLabel("활동 2 체류 시간", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("활동 1 뒤로", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("활동 2 앞으로", { exact: true }),
  ).toBeDisabled();
});
test("미완성 여행 조건을 새로고침 후 복원하고 지운다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("포르투갈");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.reload();
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await expect(
    page.getByRole("button", { name: "2 나만의 취향" }),
  ).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "1 여행의 시작" }).click();
  await expect(page.getByLabel("어느 나라로 떠나시나요?")).toHaveValue(
    "포르투갈",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "입력 초안 지우기" }).click();
  await page.reload();
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await expect(page.getByLabel("어느 나라로 떠나시나요?")).toHaveValue("");
});
test("키 없이 예시를 편집·보관·다운로드하고 오프라인 열람한다", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "당신의 취향",
  );
  await page.screenshot({
    path: `docs/process/current/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "바다 곁에서, 히로시마", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page
    .getByRole("textbox", { name: "활동 1 이름", exact: true })
    .fill("나만의 산책");
  await page.getByRole("button", { name: "보관", exact: true }).click();
  await page.getByRole("button", { name: "가이드북", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "나만의 산책", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "HTML 다운로드", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "선택한 내용 다운로드" }),
  ).toBeDisabled();
  await page.getByLabel("예산표·활동별 비용", { exact: true }).uncheck();
  await expect(
    page
      .frameLocator('iframe[title="다운로드할 가이드북 미리보기"]')
      .getByRole("heading", { name: "여행 예산", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("미리보기에서 개인 메모와 예약번호의 포함 여부를 확인했습니다.")
    .check();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "선택한 내용 다운로드" }).click();
  const file = await downloaded;
  const path = await file.path();
  expect(path).toBeTruthy();
  const html = await fs.readFile(path!, "utf8");
  expect(html).toContain("나만의 산책");
  expect(html).not.toContain("<script");
  expect(html).not.toContain('id="budget"');
  const offline = await context.newPage();
  await context.setOffline(true);
  await offline.setContent(html);
  await expect(
    offline.getByRole("heading", { name: "나만의 산책", exact: true }),
  ).toBeVisible();
  expect(
    await offline.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await offline.screenshot({
    path: `docs/process/current/guidebook-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await offline
    .locator("details")
    .evaluateAll((nodes) =>
      nodes.forEach((node) => node.removeAttribute("open")),
    );
  await offline.emulateMedia({ media: "print" });
  await expect(
    offline.getByRole("heading", { name: "나만의 산책", exact: true }),
  ).toBeVisible();
  await expect(
    offline.getByRole("navigation", { name: "가이드북 목차" }),
  ).toBeHidden();
  if (testInfo.project.name === "desktop") {
    const pdf = await offline.pdf({
      path: testInfo.outputPath("guidebook-print.pdf"),
      format: "A4",
      printBackground: true,
    });
    expect(pdf.byteLength).toBeGreaterThan(1000);
  }
  await context.setOffline(false);
  await page.reload();
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /바다 곁에서, 히로시마.*버전/ }),
  ).toBeVisible();
});
test("키는 영구 저장하지 않고 새로고침 시 지운다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("test-only-not-a-real-key");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-only",
  );
  await page.reload();
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await expect(page.getByLabel("API 키", { exact: true })).toHaveValue("");
});
test("잘못된 여행 날짜는 API 호출 전에 거절한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("여행 시작일").fill("2027-01-10");
  await page.getByLabel("여행 종료일").fill("2027-01-01");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "종료일" }),
  ).toContainText("종료일");
});
