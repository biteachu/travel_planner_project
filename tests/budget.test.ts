import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Guidebook } from "../src/components/Guidebook";
import { examples } from "../src/lib/examples";
import {
  convertedAmount,
  conversionSchema,
  money,
  preserveUserConversions,
  validateTrip,
} from "../src/lib/trip";

const conversion = {
  originalAmount: 1000,
  originalCurrency: "JPY" as const,
  rate: 9.5,
  asOf: "2026-11-18",
  source: "테스트용 입력 환율",
};
it("환산 시 통화 소수 단위를 반영하고 잘못된 환율은 거절한다", () => {
  expect(convertedAmount(1000, 9.5, "KRW")).toBe(9500);
  expect(convertedAmount(10, 1.2345, "USD")).toBe(12.35);
  expect(money(12.35, "USD")).toContain("12.35");
  expect(conversionSchema.safeParse({ ...conversion, rate: 0 }).success).toBe(
    false,
  );
  expect(
    conversionSchema.safeParse({ ...conversion, asOf: "2026-02-30" }).success,
  ).toBe(false);
});
it("사용자 환산은 같은 비용일 때만 보존하며 생성 모델의 환산 기록은 버린다", () => {
  const activity = {
    ...examples[0].days[0].activities[0],
    cost: 9500,
    costStatus: "입력" as const,
    conversion,
  };
  expect(preserveUserConversions([activity])[0].conversion).toBeUndefined();
  expect(preserveUserConversions([activity], [activity])[0].conversion).toEqual(
    conversion,
  );
  expect(
    preserveUserConversions([{ ...activity, cost: 10000 }], [activity])[0]
      .conversion,
  ).toBeUndefined();
  const trip = structuredClone(examples[0]);
  trip.days[0].activities[0] = { ...activity, cost: 1 };
  expect(validateTrip(trip).some((issue) => issue.includes("환산 기록"))).toBe(
    true,
  );
});
it("미확인 비용이 전부이면 잔액을 확정하지 않고 입력 후에는 잠정 잔액을 표시한다", () => {
  const trip = structuredClone(examples[0]);
  trip.days.forEach((day) =>
    day.activities.forEach((activity) => {
      activity.cost = null;
    }),
  );
  expect(renderToStaticMarkup(createElement(Guidebook, { trip }))).toContain(
    "잔여 예산을 계산하지 않았습니다",
  );
  trip.days[0].activities[0].cost = trip.brief.budget + 1;
  const html = renderToStaticMarkup(createElement(Guidebook, { trip }));
  expect(html).toContain("현재 계산된 초과 금액");
  expect(html).toContain("미확인 비용과 미입력 경비는 차감하지 않은 금액");
});
