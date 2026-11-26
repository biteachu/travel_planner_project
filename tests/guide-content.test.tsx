import { describe, it, expect } from "vitest";
import { examples } from "../src/lib/examples";
import { tripSchema } from "../src/lib/trip";
import { guideContentIssues } from "../src/lib/guide-content";
import { activityPhoto } from "../src/lib/guide-visuals";
import { enrichGuidebook } from "../src/lib/guide-enrichment";
import { createGuidebookExport } from "../src/lib/export";
import photos from "../e2e/fixtures/kansai-photos.json";

function book() {
  const trip = structuredClone(examples[0]);
  trip.sources = [
    {
      id: "test-source",
      title: "테스트용 근거",
      url: "https://example.com/evidence",
      provider: "예시",
      checkedAt: "2026-11-26",
    },
  ];
  const activity = trip.days[0].activities.find((a) => a.kind === "관광")!;
  trip.placeGuides = [
    {
      activityId: activity.id,
      activityTitle: activity.title,
      name: activity.title,
      introduction: "테스트용 장소 소개",
      background: "테스트용 역사적 배경",
      highlights: ["테스트용 관람 포인트"],
      visitTip: "테스트용 방문 팁",
      sourceIds: [trip.sources[0].id],
    },
  ];
  trip.visuals = {
    photos: [
      {
        ...photos[0],
        city: trip.days[0].city,
        activityId: activity.id,
        activityTitle: activity.title,
      },
    ],
    places: [],
  };
  return trip;
}
describe("guidebook depth", () => {
  it("preserves legacy books and rejects unknown evidence / stale activity links", () => {
    expect(tripSchema.safeParse(examples[0]).success).toBe(true);
    const trip = book();
    expect(guideContentIssues(trip)).toEqual([]);
    trip.placeGuides![0].sourceIds = ["invented"];
    trip.placeGuides![0].activityTitle = "다른 일정";
    expect(guideContentIssues(trip)).toHaveLength(2);
  });
  it("does not reuse photos after a place is edited", () => {
    const trip = book();
    const g = trip.placeGuides![0];
    expect(
      activityPhoto(trip, g.activityId, g.activityTitle, trip.days[0].city),
    ).toBeDefined();
    expect(
      activityPhoto(trip, g.activityId, "수정된 목적지", trip.days[0].city),
    ).toBeUndefined();
  });
  it("exports place photos, credits, history and menu descriptions", () => {
    const trip = book();
    trip.recommendations = [
      {
        kind: "식당",
        category: "이자카야",
        city: trip.days[0].city,
        name: "검증용 식당",
        reason: "테스트 추천 이유",
        tradeoff: "예약 확인",
        checks: [],
        sourceIds: [trip.sources[0].id],
        specialty: "테스트 특색",
        menu: [{ name: "검증용 메뉴", description: "테스트 메뉴 설명" }],
      },
    ];
    const html = createGuidebookExport(trip, undefined, {
      [photos[0].file]: "data:image/jpeg;base64,YWJj",
    }).html;
    expect(html).toContain("테스트용 역사적 배경");
    expect(html).toContain("테스트 메뉴 설명");
    expect(html).toContain("data:image/jpeg;base64,YWJj");
    expect(html).toContain(photos[0].license);
    expect(html).not.toContain('src="https://');
  });
  it("enrichment preserves itinerary even if a model tries to change it", async () => {
    const trip = book();
    const next = await enrichGuidebook(trip, async (stage, payload) => {
      if (stage === "research")
        return {
          text: "[SOURCE wv-1; Example] evidence",
          sources: [{ ...trip.sources[0], id: "wv-1" }],
          method: "test",
          supports: [],
        };
      const input = (payload as { trip: typeof trip }).trip;
      return {
        result: {
          ...input,
          days: input.days.slice(0, 1),
          title: "Changed",
          placeGuides: trip.placeGuides,
          recommendations: [],
        },
      };
    });
    expect(next.days).toEqual(trip.days);
    expect(next.title).toBe(trip.title);
    expect(next.visuals).toEqual(trip.visuals);
    expect(next.sources.slice(0, trip.sources.length)).toEqual(trip.sources);
    expect(next.version).toBe(trip.version + 1);
  });
  it("stops before any model call when cancelled", async () => {
    let called = false;
    await expect(
      enrichGuidebook(
        book(),
        async () => {
          called = true;
        },
        () => {
          throw new Error("cancelled");
        },
      ),
    ).rejects.toThrow("cancelled");
    expect(called).toBe(false);
  });
});
