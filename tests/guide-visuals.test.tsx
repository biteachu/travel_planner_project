import { describe, it, expect } from "vitest";
import { examples } from "../src/lib/examples";
import {
  compactText,
  dayPlaces,
  directionsLinks,
  photoSchema,
} from "../src/lib/guide-visuals";
import { createGuidebookExport } from "../src/lib/export";
import { defaultExportOptions } from "../src/lib/export-options";
describe("guidebook visuals", () => {
  it("keeps full warnings inside closed disclosure and adds top navigation", () => {
    const trip = structuredClone(examples[0]);
    trip.warnings = ["길어서 접어둘 확인 사항".repeat(30)];
    const html = createGuidebookExport(trip).html;
    expect(html).toContain('<details class="notice warning-drawer">');
    expect(html).toContain(trip.warnings[0]);
    expect(html).toContain('href="#book-top"');
    expect(compactText("가".repeat(200))).toHaveLength(111);
  });
  it("segments Google routes for mobile and excludes hidden lodging", () => {
    const trip = structuredClone(examples[0]);
    trip.days[0].activities = Array.from({ length: 10 }, (_, i) => ({
      ...trip.days[0].activities[0],
      id: `a${i}`,
      title: `장소${i}`,
      kind: i === 2 ? ("숙박" as const) : ("관광" as const),
    }));
    const links = directionsLinks(trip, 0, false);
    expect(links.length).toBe(2);
    for (const link of links) {
      const u = new URL(link.url);
      expect(u.searchParams.get("api")).toBe("1");
      expect(
        (u.searchParams.get("waypoints") || "").split("|").length,
      ).toBeLessThanOrEqual(3);
      expect(decodeURIComponent(link.url)).not.toContain("장소2");
    }
    expect(new URL(links[0].url).searchParams.get("destination")).toBe(
      new URL(links[1].url).searchParams.get("origin"),
    );
  });
  it("drops stale coordinates when an activity is renamed", () => {
    const trip = structuredClone(examples[0]);
    const a = trip.days[0].activities[0];
    trip.visuals = {
      photos: [],
      places: [
        {
          activityId: a.id,
          activityTitle: a.title,
          city: trip.days[0].city,
          title: a.title,
          lat: 34,
          lon: 135,
          sourceUrl: "https://ko.wikipedia.org/wiki/Test",
        },
      ],
    };
    expect(dayPlaces(trip, 0)).toHaveLength(1);
    a.title = "다른 곳";
    expect(dayPlaces(trip, 0)).toHaveLength(0);
  });
  it("only embeds raster photo data and rejects untrusted remote hosts", () => {
    const trip = structuredClone(examples[0]);
    const photo = {
      city: "오사카",
      title: "오사카",
      file: "test.jpg",
      url: "https://thumb.wikimedia.org/test.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:test.jpg",
      credit: "Test",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    };
    expect(photoSchema.safeParse(photo).success).toBe(true);
    expect(
      photoSchema.safeParse({ ...photo, url: "https://evil.test/test.jpg" })
        .success,
    ).toBe(false);
    trip.visuals = { photos: [photo], places: [] };
    const html = createGuidebookExport(trip, defaultExportOptions, {
      "test.jpg": "data:image/jpeg;base64,YWJj",
    }).html;
    expect(html).toContain('src="data:image/jpeg;base64,YWJj"');
    expect(html).not.toContain('src="https://');
    expect(
      createGuidebookExport(trip, defaultExportOptions, {
        "test.jpg": "data:image/svg+xml;base64,YWJj",
      }).html,
    ).not.toContain('src="data:image/svg');
  });
});
