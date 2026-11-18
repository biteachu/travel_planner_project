import { expect, it } from "vitest";
import { moveActivity } from "../src/lib/editing";
import { examples } from "../src/lib/examples";
import { validateTrip } from "../src/lib/trip";

it("인접 활동의 시작 시간을 교환하고 체류 시간과 원본을 보존한다", () => {
  const original = structuredClone(examples[0]);
  original.days[0].activities.forEach((a) => { a.locked = false; });
  const before = structuredClone(original);
  const next = moveActivity(original, 0, 0, 1);
  expect(next.days[0].activities[1]).toEqual({ ...before.days[0].activities[0], time: before.days[0].activities[1].time });
  expect(next.days[0].activities[0]).toEqual({ ...before.days[0].activities[1], time: before.days[0].activities[0].time });
  expect(original).toEqual(before);
});

it("고정 활동을 바꾸거나 넘어가지 못한다", () => {
  const trip = structuredClone(examples[0]);
  trip.days[0].activities[0].locked = true;
  expect(() => moveActivity(trip, 0, 0, 1)).toThrow("고정");
  expect(() => moveActivity(trip, 0, 1, -1)).toThrow("고정");
  expect(() => moveActivity(trip, 0, 0, -1)).toThrow("없습니다");
});

it("체류 시간이 늘어나 생긴 겹침과 자정 초과를 검출한다", () => {
  const trip = structuredClone(examples[0]);
  trip.days[0].activities[0].duration = 1440;
  expect(validateTrip(trip).some((x) => x.includes("겹칩니다"))).toBe(true);
  expect(validateTrip(trip).some((x) => x.includes("자정"))).toBe(true);
});
