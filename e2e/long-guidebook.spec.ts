import { test, expect, chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { examples } from "../src/lib/examples";
import { exportGuidebook } from "../src/lib/export";
import { datesBetween } from "../src/lib/trip";

for (const channel of ["chrome", "msedge"] as const) {
  test(`31일 HTML 가이드북: ${channel} 오프라인·모바일·인쇄`, async ({}, testInfo) => {
    const trip = structuredClone(examples[0]);
    trip.brief.startDate = "2027-01-01";
    trip.brief.endDate = "2027-01-31";
    trip.bases[0].nights = 30;
    trip.days = datesBetween(trip.brief.startDate, trip.brief.endDate).map(
      (date, i) => ({
        ...structuredClone(examples[0].days[0]),
        date,
        title: `긴 가이드북 검증 ${i + 1}일`,
        activities: examples[0].days[0].activities.map((activity, j) => ({
          ...activity,
          id: `long-${i}-${j}`,
        })),
      }),
    );
    const file = testInfo.outputPath("31-days.html");
    await fs.writeFile(file, exportGuidebook(trip));
    const browser = await chromium.launch({ channel });
    try {
      const context = await browser.newContext({ offline: true });
      const page = await context.newPage();
      const remoteRequests: string[] = [];
      page.on("request", (request) => {
        if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
      });
      await page.goto(pathToFileURL(file).href);
      await expect(page.locator(".book-day")).toHaveCount(31);
      await expect(page.locator(".book-day").last()).toContainText(
        "2027-01-31",
      );
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await page.locator(".book-day > summary").last().click();
      await expect(page.locator(".book-day").last()).not.toHaveAttribute(
        "open",
        "",
      );
      await page.emulateMedia({ media: "print" });
      await expect(
        page.locator(".book-day").last().locator(".book-activity").first(),
      ).toBeVisible();
      const pdf = await page.pdf({
        path: testInfo.outputPath("31-days.pdf"),
        format: "A4",
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(remoteRequests).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}
