import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  await mkdir(new URL("./public/", import.meta.url), { recursive: true });
  await page.goto(process.env.CAPTURE_URL || "http://localhost:3000");
  await page.getByRole("button", { name: "내 여행책 만들기" }).click();
  await page.getByLabel("어느 나라로 떠나시나요?").fill("일본");
  await page.getByLabel("여행 시작일").fill("2027-01-10");
  await page.getByLabel("여행 종료일").fill("2027-01-14");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await page.getByRole("button", { name: "동네 산책", exact: true }).click();
  await page.getByRole("button", { name: "로컬 음식", exact: true }).click();
  await page
    .getByLabel("나만의 취향", { exact: true })
    .fill("작은 골목과 바다를 보는 카페. 늦은 아침과 여유 있는 식사.");
  await page.screenshot({
    path: fileURLToPath(new URL("./public/preferences.png", import.meta.url)),
  });
  await page.goto(process.env.CAPTURE_URL || "http://localhost:3000");
  await page
    .getByRole("button", { name: /한 도시에서, 조금 더 깊이 Hiroshima/ })
    .click();
  await page.getByRole("button", { name: "일정 다듬기", exact: true }).click();
  await page.screenshot({
    path: fileURLToPath(new URL("./public/editor.png", import.meta.url)),
  });
} finally {
  await browser.close();
}
