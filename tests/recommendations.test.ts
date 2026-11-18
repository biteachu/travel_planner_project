import { expect, it } from "vitest";
import { examples } from "../src/lib/examples";
import { tripSchema, costSummary } from "../src/lib/trip";
import { exportGuidebook } from "../src/lib/export";
import { defaultExportOptions } from "../src/lib/export-options";
import { createCheckpoint, advancePipeline } from "../src/lib/pipeline";

const candidate = {
  kind: "식당" as const,
  city: "히로시마",
  name: "테스트 식당 <script>bad()</script>",
  reason: "걷는 거리를 줄이려는 취향",
  tradeoff: "메뉴 선택 폭을 비교해 주세요",
  checks: ["피하는 재료 사용 여부"],
  sourceIds: ["test-source"],
};
it("후보가 없는 기존 여행을 읽고 후보 비용을 일정 예산에 더하지 않는다", () => {
  const original = tripSchema.parse(examples[0]);
  const trip = tripSchema.parse({ ...original, recommendations: [candidate] });
  expect(costSummary(trip)).toEqual(costSummary(original));
  expect(exportGuidebook(original)).toContain(
    "근거가 연결된 식당 후보가 아직 없습니다",
  );
});
it("후보 출처와 비교 내용을 HTML에 연결하고 숙박 제외 선택을 지킨다", () => {
  const trip = tripSchema.parse({
    ...examples[0],
    sources: [
      {
        id: "test-source",
        title: "테스트 근거",
        url: "https://example.com/evidence",
        provider: "웹",
        checkedAt: "2026-11-18",
      },
    ],
    recommendations: [
      candidate,
      { ...candidate, kind: "숙소", name: "PRIVATE_HOTEL_CANDIDATE" },
    ],
  });
  const html = exportGuidebook(trip);
  expect(html).toContain('href="https://example.com/evidence"');
  expect(html).toContain("피하는 재료 사용 여부");
  expect(html).toContain("예약 미확정");
  expect(html).not.toContain("<script>bad()");
  expect(html).toContain("&lt;script&gt;");
  const limited = exportGuidebook(trip, {
    ...defaultExportOptions,
    lodging: false,
    details: false,
  });
  expect(limited).not.toContain("PRIVATE_HOTEL_CANDIDATE");
  expect(limited).not.toContain(candidate.reason);
  expect(limited).toContain("테스트 식당");
});
it("큐레이터가 근거 없는 후보를 반환하면 이전 진행 상태를 보존한다", async () => {
  const trip = structuredClone(examples[0]);
  const state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.phase = "curate";
  state.trip = trip;
  state.research = { text: "", sources: [], method: "test" };
  for (const sourceIds of [[], ["invented"]]) {
    await expect(
      advancePipeline(state, async () => ({
        result: { ...trip, recommendations: [{ ...candidate, sourceIds }] },
      })),
    ).rejects.toThrow("출처");
    expect(state.trip).toEqual(trip);
    expect(state.phase).toBe("curate");
  }
});
