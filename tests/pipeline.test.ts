import { it, expect, vi } from "vitest";
import {
  advancePipeline,
  createCheckpoint,
  checkpointSchema,
} from "../src/lib/pipeline";
import { examples } from "../src/lib/examples";
it("완료한 날짜는 다시 호출하지 않고 실패한 날짜부터 재개한다", async () => {
  const t = examples[0];
  let s = createCheckpoint(t.brief, {
    title: t.title,
    summary: t.summary,
    bases: t.bases,
    questions: [],
  });
  const call = vi
    .fn()
    .mockResolvedValueOnce({ text: "reference", sources: [], method: "test" })
    .mockResolvedValueOnce({ result: t.days[0] })
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce({ result: t.days[1] });
  s = await advancePipeline(s, call);
  s = await advancePipeline(s, call);
  await expect(advancePipeline(s, call)).rejects.toThrow("timeout");
  expect(s.days).toHaveLength(1);
  s = await advancePipeline(
    checkpointSchema.parse(JSON.parse(JSON.stringify(s))),
    call,
  );
  expect(s.days).toHaveLength(2);
  expect(call.mock.calls[3][1]).toMatchObject({ date: t.days[1].date });
  expect(JSON.stringify(s)).not.toContain("apiKey");
});
it("다른 날짜의 응답은 체크포인트에 적용하지 않는다", async () => {
  const t = examples[0];
  const s = createCheckpoint(t.brief, {
    title: t.title,
    summary: t.summary,
    bases: t.bases,
    questions: [],
  });
  s.phase = "days";
  s.research = { text: "", sources: [], method: "test" };
  await expect(
    advancePipeline(s, async () => ({ result: t.days[1] })),
  ).rejects.toThrow("다른 일정");
  expect(s.days).toHaveLength(0);
});
it("거점별 조사 실패 시 완료 자료를 보존하고 출처 ID 충돌 없이 재개한다", async () => {
  const trip = examples[1];
  let state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases.slice(0, 2),
    questions: [],
  });
  const evidence = {
    text: "Supported fact",
    sources: [
      {
        id: "source-0",
        title: "Reference",
        url: "https://example.com",
        provider: "웹",
        checkedAt: "2026-11-18",
      },
    ],
    supports: [{ text: "Supported fact", sourceIds: ["source-0"] }],
    method: "test",
  };
  const call = vi
    .fn()
    .mockResolvedValueOnce(evidence)
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(evidence);
  state = await advancePipeline(state, call);
  expect(state.phase).toBe("research");
  expect(state.researchCompleted).toBe(1);
  await expect(advancePipeline(state, call)).rejects.toThrow("timeout");
  expect(state.research?.sources).toHaveLength(1);
  state = await advancePipeline(
    checkpointSchema.parse(JSON.parse(JSON.stringify(state))),
    call,
  );
  expect(state.phase).toBe("days");
  expect(call.mock.calls.map((call) => call[1].focusBase)).toEqual([
    trip.bases[0].city,
    trip.bases[1].city,
    trip.bases[1].city,
  ]);
  expect(state.research?.sources.map((source) => source.id)).toEqual([
    "base-0-source-0",
    "base-1-source-0",
  ]);
  expect(state.research?.supports?.map((support) => support.sourceIds)).toEqual(
    [["base-0-source-0"], ["base-1-source-0"]],
  );
});
