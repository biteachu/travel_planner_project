import { expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import { runAgent } from "../src/lib/agents";
import { examples } from "../src/lib/examples";
import { createCheckpoint, advancePipeline } from "../src/lib/pipeline";
afterEach(() => vi.unstubAllGlobals());

it("new-trip curation adds real retrieved evidence and carries it into review", async () => {
  const trip = structuredClone(examples[0]);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            query: {
              pages: [
                {
                  pageid: 77,
                  title: "Kyoto/North",
                  extract:
                    "== See ==\nFunaoka Onsen details\n== Eat ==\nRestaurant menu",
                  revisions: [{ revid: 8, timestamp: "2026-01-01T00:00:00Z" }],
                },
              ],
            },
          }),
        ),
    ),
  );
  const session = {
    check: async () => ({ connected: true, provider: "test", model: "test" }),
    async generate<T>(
      _system: string,
      data: unknown,
      schema: z.ZodType<T>,
    ): Promise<T> {
      const input = data as { trip?: typeof trip };
      if (!input.trip)
        return schema.parse({
          titles: ["Kyoto/North"],
          names: ["Funaoka Onsen"],
        });
      const source = input.trip.sources.find((s) =>
        s.id.startsWith("detail-"),
      )!;
      expect(source.url).toContain("oldid=8");
      return schema.parse({
        placeGuides: [
          {
            activityId: trip.days[0].activities[0].id,
            activityTitle: trip.days[0].activities[0].title,
            name: "Test sight",
            searchNames: ["Test Sight"],
            placeCity: "Kyoto",
            introduction: "Evidence-backed introduction",
            background: "",
            highlights: ["Point"],
            visitTip: "",
            sourceIds: [source.id],
          },
        ],
        recommendations: [],
        stories: [],
        tips: [],
        warnings: [],
      });
    },
  };
  let state = createCheckpoint(trip.brief, {
    title: trip.title,
    summary: trip.summary,
    bases: trip.bases,
    questions: [],
  });
  state.trip = trip;
  state.phase = "curate";
  state.research = { text: "", sources: [], method: "test" };
  state = await advancePipeline(state, async (stage, payload) =>
    runAgent(
      "",
      stage as "curate",
      payload,
      new AbortController().signal,
      session,
    ),
  );
  expect(state.phase).toBe("review");
  expect(state.research?.text).toContain("Funaoka Onsen details");
  expect(state.research?.sources[0].id).toBe(
    state.trip?.placeGuides?.[0].sourceIds[0],
  );
  expect(state.trip?.days).toEqual(trip.days);
});

it("supplemental research failure preserves existing material and reports the gap", async () => {
  const trip = structuredClone(examples[0]);
  const session = {
    check: async () => ({ connected: true, provider: "test", model: "test" }),
    async generate<T>(
      _system: string,
      data: unknown,
      schema: z.ZodType<T>,
    ): Promise<T> {
      if (!(data as { trip?: unknown }).trip) throw new Error("lookup failed");
      return schema.parse({
        placeGuides: [],
        recommendations: [],
        stories: [],
        tips: [],
        warnings: [],
      });
    },
  };
  const output = (await runAgent(
    "",
    "curate",
    { trip, research: { text: "old evidence", sources: [], method: "test" } },
    new AbortController().signal,
    session,
  )) as { result: typeof trip };
  expect(output.result.days).toEqual(trip.days);
  expect(output.result.warnings.join()).toContain(
    "추가 자료 조사를 완료하지 못해",
  );
});
