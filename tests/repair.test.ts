import { expect, it, vi } from "vitest";
import { examples } from "../src/lib/examples";
import {
  advancePipeline,
  createCheckpoint,
  checkpointSchema,
} from "../src/lib/pipeline";
import { validateTrip } from "../src/lib/trip";

function reviewedState() {
  const trip = structuredClone(examples[0]);
  const state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.trip = trip;
  state.days = trip.days;
  state.phase = "review";
  state.research = { text: "", sources: [], method: "test" };
  return state;
}
it("검토가 계속 수정을 요청해도 두 차례 후 종료하고 경고를 남긴다", async () => {
  let state = reviewedState();
  const call = vi.fn(async (stage, payload) => ({
    result: payload.trip,
    ...(stage === "review"
      ? {
          repairDates: [payload.trip.days[0].date],
          reviewWarnings: ["동선을 재확인하세요."],
        }
      : {}),
  }));
  for (let i = 0; i < 5; i++)
    state = await advancePipeline(
      checkpointSchema.parse(JSON.parse(JSON.stringify(state))),
      call,
    );
  expect(state.phase).toBe("complete");
  expect(state.repairCount).toBe(2);
  expect(call.mock.calls.filter(([stage]) => stage === "revise")).toHaveLength(
    2,
  );
  expect(state.trip?.warnings.some((warning) => warning.includes("한도"))).toBe(
    true,
  );
  expect(state.trip?.status).toBe("확인 필요");
});

it("고정 일정을 바꾼 자동 수정은 반영하지 않는다", async () => {
  const state = reviewedState();
  state.phase = "repair";
  state.repairDate = state.trip!.days[0].date;
  state.trip!.days[0].activities[0].locked = true;
  const changed = structuredClone(state.trip!);
  changed.days[0].activities[0].time = "23:00";
  await expect(
    advancePipeline(state, async () => ({ result: changed })),
  ).rejects.toThrow("고정");
  expect(state.repairCount || 0).toBe(0);
  expect(state.trip!.days[0].activities[0].time).not.toBe("23:00");
});

it("선택하지 않은 날짜를 보존하고 해결된 시간 경고는 재검토에서 제거한다", async () => {
  let state = reviewedState();
  const original = structuredClone(state.trip!);
  state.trip!.days[0].activities[0].duration = 1440;
  state.trip!.warnings.push(...validateTrip(state.trip!));
  state = await advancePipeline(state, async (_stage, payload: any) => ({
    result: payload.trip,
    repairDates: [original.days[0].date],
    reviewWarnings: ["시간 조정 필요"],
  }));
  const proposed = structuredClone(original);
  proposed.days[1].title = "변경하면 안 되는 날";
  state = await advancePipeline(state, async () => ({ result: proposed }));
  expect(state.trip!.days[1].title).toBe(original.days[1].title);
  state = await advancePipeline(state, async (_stage, payload: any) => ({
    result: payload.trip,
    repairDates: [],
    reviewWarnings: [],
  }));
  expect(state.phase).toBe("complete");
  expect(
    state.trip!.warnings.some(
      (warning) =>
        warning.includes("겹칩니다") ||
        warning.includes("자정") ||
        warning.includes("시간 조정 필요"),
    ),
  ).toBe(false);
});
