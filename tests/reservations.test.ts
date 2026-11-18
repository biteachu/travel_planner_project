import { expect, it } from "vitest";
import {
  briefSchema,
  fixedActivities,
  fixedDayIssues,
  type FixedEvent,
} from "../src/lib/trip";
import { examples } from "../src/lib/examples";
import { advancePipeline, createCheckpoint } from "../src/lib/pipeline";

const trip = examples[0];
const event: FixedEvent = {
  id: "museum",
  date: trip.brief.startDate,
  time: "10:00",
  duration: 60,
  title: "예약한 미술관",
  kind: "관광",
};
const brief = { ...trip.brief, fixedEvents: [event] };

it("기간 밖·겹침·자정 초과·중복된 확정 예약을 거부한다", () => {
  expect(briefSchema.safeParse(brief).success).toBe(true);
  for (const fixedEvents of [
    [{ ...event, date: "2099-01-01" }],
    [event, { ...event, id: "overlap", time: "10:30" }],
    [{ ...event, time: "23:30" }],
    [event, event],
  ])
    expect(briefSchema.safeParse({ ...brief, fixedEvents }).success).toBe(
      false,
    );
});

it("예약 누락·시간 변경·고정 해제·중복·다른 활동과 겹침을 탐지한다", () => {
  const fixed = fixedActivities(brief, event.date)[0];
  const day = {
    date: event.date,
    title: "여행",
    city: "히로시마",
    activities: [fixed],
  };
  expect(fixedDayIssues(brief, day)).toEqual([]);
  for (const activities of [
    [],
    [{ ...fixed, time: "11:00" }],
    [{ ...fixed, locked: false }],
    [fixed, fixed],
    [fixed, { ...fixed, id: "other", time: "10:30" }],
  ]) {
    expect(
      fixedDayIssues(brief, { ...day, activities }).length,
    ).toBeGreaterThan(0);
  }
  expect(
    fixedDayIssues(brief, {
      ...day,
      activities: [fixed, { ...fixed, id: "after", time: "11:00" }],
    }),
  ).toEqual([]);
});

it("예약이 없는 AI 응답은 저장하지 않고 재시도로 올바른 날짜를 받는다", async () => {
  const state = createCheckpoint(brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.phase = "days";
  state.research = { text: "", sources: [], method: "test" };
  await expect(
    advancePipeline(state, async () => ({ result: trip.days[0] })),
  ).rejects.toThrow("고정 일정");
  expect(state.days).toHaveLength(0);
  const next = await advancePipeline(state, async () => ({
    result: { ...trip.days[0], activities: fixedActivities(brief, event.date) },
  }));
  expect(next.days[0].activities[0].locked).toBe(true);
});
