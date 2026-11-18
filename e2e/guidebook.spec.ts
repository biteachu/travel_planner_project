import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { examples } from "../src/lib/examples";
test("생성 완료 후 보관 실패 시 새로고침으로 복구하고 다시 보관한다", async ({
  page,
}) => {
  const trip = {
    ...structuredClone(examples[0]),
    title: "보관 실패 복구 여행",
    isExample: false,
  };
  const pending = {
    brief: trip.brief,
    outline: {
      title: trip.title,
      summary: trip.summary,
      bases: trip.bases,
      questions: [],
    },
    research: { text: "", sources: [], method: "test" },
    days: trip.days,
    trip,
    phase: "review",
    id: trip.id,
  };
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("travel-pending-v1", JSON.stringify(value));
      sessionStorage.setItem("seeded", "yes");
    }
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "travel-books-v1" &&
        sessionStorage.getItem("allowSave") !== "yes"
      )
        throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }, pending);
  await page.route("**/api/agent", async (route) => {
    const { payload } = route.request().postDataJSON();
    await route.fulfill({
      json: { result: payload.trip, repairDates: [], reviewWarnings: [] },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("test-only-save-failure");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: "이어서 만들기", exact: true })
    .click();
  await expect(
    page.getByText(/가이드북은 완성됐지만 보관하지 못했습니다/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("travel-pending-v1")!).phase,
    ),
  ).toBe("complete");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: trip.title, exact: true }),
  ).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("allowSave", "yes"));
  await page.getByRole("button", { name: "보관", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("travel-pending-v1")),
  ).toBeNull();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("travel-books-v1")!)[0].title,
    ),
  ).toBe(trip.title);
});
test("잘못된 편집 저장을 거절하고 마지막 정상 보관본을 유지한다", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "보관", exact: true }).click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("travel-books-v1"),
  );
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page.getByLabel("활동 1 이름", { exact: true }).fill("");
  await page.getByRole("button", { name: "보관", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "이전 보관본은 유지됩니다" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("travel-books-v1")),
  ).toBe(saved);
  await page.reload();
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /바다 곁에서, 히로시마.*버전/ }),
  ).toBeVisible();
});
test("형식이 잘못된 보관본도 복구용 원본을 남긴다", async ({ page }) => {
  const invalid = structuredClone(examples[0]);
  invalid.days[0].activities[0].title = "";
  await page.addInitScript(
    (trip) => localStorage.setItem("travel-books-v1", JSON.stringify([trip])),
    invalid,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "복구용 JSON 다운로드" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travel-books-recovery-v1")!),
    ),
  ).toEqual([invalid]);
});
test("복구본 저장 공간이 없어도 원본 다운로드와 덮어쓰기 차단을 유지한다", async ({
  page,
}) => {
  const invalid = structuredClone(examples[0]);
  invalid.days[0].activities[0].title = "";
  await page.addInitScript((trip) => {
    localStorage.setItem("travel-books-v1", JSON.stringify([trip]));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "travel-books-recovery-v1")
        throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  }, invalid);
  await page.goto("/");
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "보관", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "기존 원본 보호" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("travel-books-v1")!),
    ),
  ).toEqual([invalid]);
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "복구용 JSON 다운로드" }),
  ).toBeVisible();
});
test("수정 요청 중 직접 바꾼 내용은 늦은 AI 응답으로 덮어쓰지 않는다", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived!: () => void;
  const pending = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/agent", async (route) => {
    const { payload } = route.request().postDataJSON();
    arrived();
    await wait;
    payload.trip.days[0].activities[0].title = "늦게 도착한 수정";
    await route.fulfill({ json: { result: payload.trip } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("test-only-stale-revision");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page
    .getByPlaceholder("걷는 시간을 줄이고, 카페에서 쉬는 시간을 늘려주세요.")
    .fill("휴식 늘리기");
  await page.getByRole("button", { name: "수정안 만들기" }).click();
  await pending;
  await page
    .getByLabel("활동 1 이름", { exact: true })
    .fill("내가 직접 바꾼 일정");
  release();
  await expect(
    page.getByRole("button", { name: "중단", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("활동 1 이름", { exact: true })).toHaveValue(
    "내가 직접 바꾼 일정",
  );
  await expect(
    page.getByRole("button", { name: "적용", exact: true }),
  ).toHaveCount(0);
});
test("식당·숙박 후보의 비교 정보와 출처를 모바일에서도 읽는다", async ({
  page,
}) => {
  const trip = {
    ...structuredClone(examples[0]),
    title: "후보 비교 테스트",
    sources: [
      {
        id: "evidence",
        title: "테스트 근거",
        url: "https://example.com/evidence",
        provider: "Wikivoyage",
        license: "CC BY-SA 4.0",
        attributionUrl:
          "https://en.wikivoyage.org/w/index.php?title=Test&action=history",
        revision: 123,
        revisedAt: "2026-11-18T00:00:00Z",
        checkedAt: "2026-11-18",
      },
    ],
    recommendations: ["식당", "숙박 지역"].map((kind) => ({
      kind,
      city: "히로시마",
      name: `${kind} 테스트 후보`,
      reason: "많이 걷지 않는 취향을 반영한 제안",
      tradeoff: "도심 접근성과 주변 혼잡도를 비교해 주세요",
      checks: ["방문 날짜의 영업 및 이용 가능 여부"],
      sourceIds: ["evidence"],
    })),
  };
  await page.addInitScript(
    (value) => localStorage.setItem("travel-books-v1", JSON.stringify([value])),
    trip,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
  await page.getByRole("button", { name: /후보 비교 테스트.*버전/ }).click();
  await page.getByRole("link", { name: "먹을 곳", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "식당 테스트 후보", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#dining").getByRole("link", { name: "테스트 근거" }),
  ).toHaveAttribute("href", "https://example.com/evidence");
  await page.getByRole("link", { name: "머무를 곳", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "숙박 지역 테스트 후보", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#prepare").getByRole("link", { name: "기여자·문서 이력" }),
  ).toHaveAttribute("href", /action=history/);
  await expect(page.locator("#prepare")).toContainText("한국어로 번역·요약");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("생성 중단은 완료 날짜를 보존하고 재개 시 남은 날짜만 요청한다", async ({
  page,
}) => {
  const trip = structuredClone(examples[0]);
  const pending = {
    brief: trip.brief,
    outline: {
      title: trip.title,
      summary: trip.summary,
      bases: trip.bases,
      questions: [],
    },
    research: { text: "", sources: [], method: "test" },
    days: trip.days.slice(0, -1),
    trip: null,
    phase: "days",
    id: "cancellation-test",
  };
  await page.addInitScript(
    (value) => localStorage.setItem("travel-pending-v1", JSON.stringify(value)),
    pending,
  );
  const requestedDates: string[] = [];
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived!: () => void;
  const requestArrived = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/agent", async (route) => {
    const { stage, payload } = route.request().postDataJSON();
    if (stage === "day") {
      requestedDates.push(payload.date);
      if (requestedDates.length === 1) {
        arrived();
        await delayed;
      }
      await route.fulfill({ json: { result: trip.days.at(-1) } });
    } else
      await route.fulfill({
        json: { result: payload.trip, repairDates: [], reviewWarnings: [] },
      });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "API 키 설정", exact: true }).click();
  await page.getByLabel("API 키", { exact: true }).fill("test-only-cancel-key");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page
    .getByRole("button", { name: "이어서 만들기", exact: true })
    .click();
  await requestArrived;
  await page.getByRole("button", { name: "중단", exact: true }).click();
  release();
  await expect(
    page.getByRole("button", { name: "이어서 만들기", exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("travel-pending-v1")!),
  );
  expect(stored.days).toEqual(pending.days);
  expect(stored.phase).toBe("days");
  expect(JSON.stringify(stored)).not.toContain("test-only-cancel-key");
  await page
    .getByRole("button", { name: "이어서 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "중단", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: trip.title, exact: true }),
  ).toBeVisible();
  expect(requestedDates).toEqual([
    trip.days.at(-1)!.date,
    trip.days.at(-1)!.date,
  ]);
  expect(
    await page.evaluate(() => localStorage.getItem("travel-pending-v1")),
  ).toBeNull();
});
test("예시 재생은 API 없이 단계 이동·일시 정지 후 가이드북으로 이어진다", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/agent")) calls.push(request.url());
  });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "만드는 과정 살펴보기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/AI·검색 API를 호출하거나/)).toBeVisible();
  await dialog.getByRole("button", { name: "자동 재생", exact: true }).click();
  await page.clock.fastForward(4500);
  await expect(
    dialog.getByText("예시 재생 · 2 / 6", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "일시 정지" }).click();
  await page.clock.fastForward(9000);
  await expect(
    dialog.getByText("예시 재생 · 2 / 6", { exact: true }),
  ).toBeVisible();
  for (let step = 0; step < 4; step++)
    await dialog
      .getByRole("button", { name: "다음 단계", exact: true })
      .click();
  await dialog.getByRole("button", { name: "예시 가이드북 열기" }).click();
  await expect(
    page.getByRole("heading", { name: "바다 곁에서, 히로시마", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("체험용 예시", { exact: true })).toBeVisible();
  expect(calls).toHaveLength(0);
});
test("생성 후 검토·자동 수정·재검토를 거쳐 가이드북을 연다", async ({
  page,
}) => {
  const stages: string[] = [];
  let reviews = 0;
  await page.route("**/api/agent", async (route) => {
    const { stage, payload } = route.request().postDataJSON();
    stages.push(stage);
    let response;
    if (stage === "outline")
      response = {
        result: {
          title: "하루 여행",
          summary: "모의 생성 검증",
          bases: [
            {
              city: "히로시마",
              nights: 0,
              reason: "당일 여행",
              neighborhood: "",
            },
          ],
          questions: [],
        },
      };
    else if (stage === "research")
      response = { text: "", sources: [], method: "test" };
    else if (stage === "day")
      response = {
        result: { ...structuredClone(examples[0].days[0]), date: payload.date },
      };
    else if (stage === "review") {
      reviews++;
      response = {
        result: payload.trip,
        repairDates: reviews === 1 ? [payload.trip.days[0].date] : [],
        reviewWarnings: reviews === 1 ? ["첫 활동 조정"] : [],
      };
    } else if (stage === "revise") {
      payload.trip.days[0].activities[0].title = "검토 후 다듬은 산책";
      response = { result: payload.trip };
    } else response = { result: payload.trip };
    await route.fulfill({ json: response });
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
  await page.getByLabel("여행 종료일").fill("2027-01-10");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "여행 골격 제안받기" }).click();
  await page
    .getByRole("button", { name: "이 구성으로 가이드북 만들기" })
    .click();
  await expect(
    page.getByRole("heading", { name: "검토 후 다듬은 산책", exact: true }),
  ).toBeVisible();
  expect(stages).toEqual([
    "outline",
    "research",
    "day",
    "budget",
    "curate",
    "review",
    "revise",
    "review",
  ]);
  expect(
    await page.evaluate(() => localStorage.getItem("travel-pending-v1")),
  ).toBeNull();
});
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
