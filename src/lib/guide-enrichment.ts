import { tripSchema, type Trip } from "./trip";
import { researchSchema, mergeResearch } from "./research";
import { guideContentIssues } from "./guide-content";
import type { AgentCaller } from "./pipeline";

export async function enrichGuidebook(
  trip: Trip,
  call: AgentCaller,
  check: () => void = () => {},
) {
  const bases = trip.bases.filter(
    (b, i, all) => all.findIndex((x) => x.city === b.city) === i,
  );
  let research: ReturnType<typeof researchSchema.parse> | null = null;
  const namespace = `guide-${crypto.randomUUID()}`;
  for (const [index, base] of bases.entries()) {
    check();
    const raw = researchSchema.parse(
      await call("research", {
        brief: trip.brief,
        outline: {
          title: trip.title,
          summary: trip.summary,
          bases: trip.bases,
          questions: [],
        },
        focusBase: base.city,
        places: trip.days
          .flatMap((day) =>
            day.activities
              .filter(
                (activity) =>
                  activity.kind !== "이동" && activity.kind !== "숙박",
              )
              .map((activity) => ({
                city: day.city,
                name: activity.placeName || activity.title,
              })),
          )
          .slice(0, 300),
      }),
    );
    research = mergeResearch(research, raw, base.city, index, bases.length);
  }
  check();
  if (!research?.sources.length)
    throw new Error(
      "보강할 공개 자료를 찾지 못했습니다. 기존 여행책은 유지됩니다.",
    );
  // A refreshed revision must not replace evidence attached to the original itinerary.
  research.text = research.sources.reduce(
    (text, source) =>
      text.replaceAll(
        `[SOURCE ${source.id};`,
        `[SOURCE ${namespace}-${source.id};`,
      ),
    research.text,
  );
  research.sources = research.sources.map((s) => ({
    ...s,
    id: `${namespace}-${s.id}`,
  }));
  research.supports = [];
  const enrichedSources = [...trip.sources, ...research.sources];
  if (enrichedSources.length > 300)
    throw new Error(
      "이 여행책의 출처 저장 한도에 도달했습니다. 원본을 복제해 정리해 주세요.",
    );
  const input = { ...trip, sources: enrichedSources };
  const response = (await call("curate", { trip: input, research })) as {
    result: unknown;
  };
  check();
  const content = tripSchema.parse(response.result);
  const next: Trip = {
    ...trip,
    placeGuides: content.placeGuides,
    recommendations: content.recommendations,
    stories: content.stories,
    tips: content.tips,
    warnings: content.warnings,
    sources: enrichedSources,
    version: trip.version + 1,
    updatedAt: new Date().toISOString(),
    status: "확인 필요",
  };
  const issues = guideContentIssues(next);
  if (issues.length) throw new Error(issues.join(" "));
  return tripSchema.parse(next);
}
