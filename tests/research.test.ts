import { expect, it, vi } from "vitest";
import { hasUnknownSources, mergeResearch } from "../src/lib/research";
import { advancePipeline, createCheckpoint } from "../src/lib/pipeline";
import { examples } from "../src/lib/examples";
it("긴 조사 자료는 거점별 공간을 배분하고 생략 사실을 남긴다", () => {
  const evidence = { text: "x".repeat(100000), sources: [], method: "test" };
  const first = mergeResearch(null, evidence, "first", 0, 2);
  const merged = mergeResearch(
    first,
    { ...evidence, text: "y".repeat(100000) },
    "second",
    1,
    2,
  );
  expect(merged.text).toContain("[first]");
  expect(merged.text).toContain("[second]");
  expect(merged.text).toContain("생략");
  expect(merged.text.length).toBeLessThan(100000);
});

it("조사 목록에 없는 출처를 탐지한다", () => {
  expect(
    hasUnknownSources([{ sourceIds: ["invented"] }], [{ id: "source-0" }]),
  ).toBe(true);
});

it("예산·큐레이터·검토에 조사 원문과 문장별 출처를 함께 전달한다", async () => {
  const trip = structuredClone(examples[0]);
  let state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.trip = trip;
  state.phase = "budget";
  state.research = {
    text: "Research evidence",
    sources: [],
    method: "test",
    supports: [],
  };
  const caller = vi.fn().mockResolvedValue({ result: trip });
  for (let i = 0; i < 3; i++) state = await advancePipeline(state, caller);
  expect(caller.mock.calls.map((call) => call[0])).toEqual([
    "budget",
    "curate",
    "review",
  ]);
  for (const call of caller.mock.calls)
    expect(call[1].research.text).toBe("Research evidence");
});

it("만들어진 출처를 가진 일정과 이야기는 체크포인트에 반영하지 않는다", async () => {
  const trip = structuredClone(examples[0]);
  const state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.phase = "days";
  state.research = { text: "", sources: [], method: "test" };
  const day = structuredClone(trip.days[0]);
  day.activities[0].sourceIds = ["invented"];
  await expect(
    advancePipeline(state, async () => ({ result: day })),
  ).rejects.toThrow("출처");
  expect(state.days).toHaveLength(0);
  state.phase = "curate";
  state.trip = trip;
  const altered = {
    ...trip,
    stories: [{ title: "story", body: "claim", sourceIds: ["invented"] }],
  };
  await expect(
    advancePipeline(state, async () => ({ result: altered })),
  ).rejects.toThrow("출처");
  expect(state.trip).toEqual(trip);
});
