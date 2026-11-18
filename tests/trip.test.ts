import { describe, it, expect } from "vitest";
import {
  briefSchema,
  tripSchema,
  validateTrip,
  costSummary,
  safeUrl,
} from "../src/lib/trip";
import { examples } from "../src/lib/examples";

describe("여행 계약", () => {
  it("종료일이 시작일보다 빠르면 거절한다", () => {
    expect(
      briefSchema.safeParse({ ...examples[0].brief, endDate: "2026-01-01" })
        .success,
    ).toBe(false);
  });
  it("존재하지 않는 날짜를 거절한다", () => {
    expect(
      briefSchema.safeParse({ ...examples[0].brief, startDate: "2026-02-30" })
        .success,
    ).toBe(false);
  });
  it("가이드북 예시를 동일한 스키마로 검증한다", () =>
    examples.forEach((t) =>
      expect(tripSchema.safeParse(t).success).toBe(true),
    ));
  it("비용 미확인 수를 별도로 센다", () => {
    const t = structuredClone(examples[0]);
    t.days[0].activities[0].cost = null;
    expect(costSummary(t).unknown).toBeGreaterThan(0);
  });
  it("중복된 날짜를 검출한다", () => {
    const t = structuredClone(examples[0]);
    t.days.push(t.days[0]);
    expect(validateTrip(t).some((x) => x.includes("중복"))).toBe(true);
  });
  it("확정 활동 변경을 검출한다", () => {
    const old = structuredClone(examples[0]);
    old.days[0].activities[0].locked = true;
    const next = structuredClone(old);
    next.days[0].activities[0].title = "변경";
    expect(validateTrip(next, old).some((x) => x.includes("고정"))).toBe(true);
  });
  it("자바스크립트와 데이터 URL을 차단한다", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,x")).toBeUndefined();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
  });
});
