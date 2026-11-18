import { test, expect } from "@playwright/test";
import { examples } from "../src/lib/examples";

test.skip(
  process.env.RUN_ACCOUNT_MOCK !== "1",
  "Requires the documented mock-account dev server",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript((trips) => {
    localStorage.setItem("travel-books-v1", JSON.stringify(trips));
    localStorage.setItem(
      "sb-account-test-auth-token",
      JSON.stringify({
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: "test-owner" },
      }),
    );
  }, examples);
  await page.route("https://account-test.supabase.co/auth/v1/user", (route) =>
    route.fulfill({
      json: { id: "test-owner", email: "test@example.invalid" },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "내 여행책", exact: true }).click();
});

test("계정 불러오기 중 보관한 사본은 늦은 응답에도 유지된다", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(
    "https://account-test.supabase.co/rest/v1/trips?**",
    async (route) => {
      started();
      await gate;
      await route.fulfill({ json: [{ data: examples[0] }] });
    },
  );
  await page.getByRole("button", { name: "계정 여행 불러오기" }).click();
  await requested;
  await expect(
    page.getByRole("button", { name: "계정 여행 불러오기" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: `${examples[0].title} 복제`, exact: true })
    .click();
  release();
  await expect(
    page.getByRole("alert").filter({ hasText: "현재 내용을 유지했습니다" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("travel-books-v1")!),
  );
  expect(saved).toHaveLength(3);
  expect(saved.some((t: { title: string }) => t.title.endsWith("(사본)"))).toBe(
    true,
  );
});

test("계정 삭제 응답은 그동안 연 다른 여행과 새 사본을 지우지 않는다", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(
    "https://account-test.supabase.co/rest/v1/trips?**",
    async (route) => {
      started();
      await gate;
      await route.fulfill({ status: 204 });
    },
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: `${examples[0].title} 계정에서도 삭제`,
      exact: true,
    })
    .click();
  await requested;
  await page
    .getByRole("button", { name: `${examples[1].title} 복제`, exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ has: page.getByText(examples[1].title, { exact: true }) })
    .click();
  release();
  await expect(
    page.getByText(
      "계정의 여행·버전 기록과 이 브라우저의 보관본을 삭제했습니다.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: examples[1].title }).first(),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("travel-books-v1")!),
  );
  expect(saved).toHaveLength(2);
  expect(saved.some((t: { id: string }) => t.id === examples[0].id)).toBe(
    false,
  );
});

test("계정 저장 중 추가 편집은 현재 화면에 남고 저장 시점을 안내한다", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  let payload: { data: (typeof examples)[number] } | undefined;
  await page.route(
    "https://account-test.supabase.co/rest/v1/trips?**",
    async (route) => {
      payload = route.request().postDataJSON();
      started();
      await gate;
      await route.fulfill({ status: 201, json: [] });
    },
  );
  await page
    .getByRole("button")
    .filter({ has: page.getByText(examples[0].title, { exact: true }) })
    .click();
  await page.getByRole("button", { name: "계정 저장", exact: true }).click();
  await requested;
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page
    .getByLabel("활동 1 이름", { exact: true })
    .fill("저장 요청 뒤의 편집");
  release();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "그 뒤의 편집 내용은 다시 저장" }),
  ).toBeVisible();
  await expect(page.getByLabel("활동 1 이름", { exact: true })).toHaveValue(
    "저장 요청 뒤의 편집",
  );
  expect(payload?.data.days[0].activities[0].title).toBe(
    examples[0].days[0].activities[0].title,
  );
});

test("계정 삭제 중 같은 여행을 수정해 보관하면 새 로컬 수정본은 유지한다", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(
    "https://account-test.supabase.co/rest/v1/trips?**",
    async (route) => {
      started();
      await gate;
      await route.fulfill({ status: 204 });
    },
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: `${examples[0].title} 계정에서도 삭제`,
      exact: true,
    })
    .click();
  await requested;
  await page
    .getByRole("button")
    .filter({ has: page.getByText(examples[0].title, { exact: true }) })
    .click();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page
    .getByLabel("활동 1 이름", { exact: true })
    .fill("삭제 요청 뒤의 편집");
  await page.getByRole("button", { name: "보관", exact: true }).click();
  release();
  await expect(
    page.getByRole("status").filter({ hasText: "브라우저 수정본은 유지" }),
  ).toBeVisible();
  await expect(page.getByLabel("활동 1 이름", { exact: true })).toHaveValue(
    "삭제 요청 뒤의 편집",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("travel-books-v1")!),
  );
  expect(
    saved.find((t: { id: string }) => t.id === examples[0].id).days[0]
      .activities[0].title,
  ).toBe("삭제 요청 뒤의 편집");
});
