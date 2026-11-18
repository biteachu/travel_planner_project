import { expect, it } from "vitest";
import { briefSchema, dayConstraintIssues } from "../src/lib/trip";
import { examples } from "../src/lib/examples";
import { createCheckpoint, advancePipeline } from "../src/lib/pipeline";

const trip = examples[0];
const brief = { ...trip.brief, firstDayStart: "14:00", lastDayEnd: "15:00" };
const activity = { ...trip.days[0].activities[0], time: "14:00", duration: 60 };

it("경계 시간에 맞는 일정은 허용하고 첫날 이전·마지막 날 이후 활동은 거절한다", () => {
  const first = {
    ...trip.days[0],
    date: brief.startDate,
    activities: [activity],
  };
  const last = { ...first, date: brief.endDate };
  expect(dayConstraintIssues(brief, first)).toEqual([]);
  expect(dayConstraintIssues(brief, last)).toEqual([]);
  expect(
    dayConstraintIssues(brief, {
      ...first,
      activities: [{ ...activity, time: "13:59" }],
    }),
  ).toHaveLength(1);
  expect(
    dayConstraintIssues(brief, {
      ...last,
      activities: [{ ...activity, duration: 61 }],
    }),
  ).toHaveLength(1);
  expect(
    dayConstraintIssues(brief, {
      ...first,
      date: trip.days[1].date,
      activities: [{ ...activity, time: "09:00" }],
    }),
  ).toEqual([]);
});

it("당일 여행 시간 역전과 가능 시간 밖의 확정 예약을 거절한다", () => {
  expect(
    briefSchema.safeParse({
      ...brief,
      endDate: brief.startDate,
      lastDayEnd: "13:00",
    }).success,
  ).toBe(false);
  expect(
    briefSchema.safeParse({
      ...brief,
      fixedEvents: [
        {
          id: "early",
          title: "예약",
          date: brief.startDate,
          time: "13:00",
          duration: 60,
          kind: "관광",
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    briefSchema.safeParse({ ...brief, firstDayStart: "25:00" }).success,
  ).toBe(false);
  expect(
    briefSchema.safeParse({ ...trip.brief, firstDayStart: "", lastDayEnd: "" })
      .success,
  ).toBe(true);
});

it("활동 가능 시간을 위반한 날짜 응답을 체크포인트에 저장하지 않는다", async () => {
  const state = createCheckpoint(brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.phase = "days";
  state.research = { text: "", sources: [], method: "test" };
  await expect(
    advancePipeline(state, async () => ({
      result: { ...trip.days[0], activities: [{ ...activity, time: "09:00" }] },
    })),
  ).rejects.toThrow("시작 가능 시간");
  expect(state.days).toHaveLength(0);
});
