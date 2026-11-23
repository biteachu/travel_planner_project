import { it, expect } from "vitest";
import {
  exportGuidebook,
  createGuidebookExport,
  guidebookTemplateVersion,
} from "../src/lib/export";
import { examples } from "../src/lib/examples";
import { defaultExportOptions } from "../src/lib/export-options";
it("새 가이드북에 오프라인 글꼴·라이선스와 다중 거점 표지 스타일을 포함한다", () => {
  const html = exportGuidebook(examples[1]);
  expect(html).toContain("data:font/woff2;base64,");
  expect(html).toContain("font-src data:");
  expect(html).toContain('name="font-license"');
  expect(html).toContain("SIL OPEN FONT LICENSE");
  expect(html).toContain("guidebook-multi");
  expect(html).not.toContain('url("/design-preview/');
});
it("출력 스냅샷은 여행 버전·시각·선택 항목을 보존하고 입력 원문을 포함하지 않는다", () => {
  const trip = structuredClone(examples[0]);
  trip.brief.reservations = "PRIVATE_RESERVATION_RAW";
  const options = { ...defaultExportOptions, budget: false };
  const record = createGuidebookExport(trip, options);
  expect(record.tripId).toBe(trip.id);
  expect(record.tripVersion).toBe(trip.version);
  expect(record.templateVersion).toBe(guidebookTemplateVersion);
  expect(Number.isNaN(Date.parse(record.createdAt))).toBe(false);
  expect(record.html).toContain('name="travel-guidebook-export"');
  expect(record.html).toContain(record.id);
  expect(record.html).not.toContain("PRIVATE_RESERVATION_RAW");
  const snapshot = record.html;
  options.budget = true;
  trip.title = "나중에 편집한 제목";
  expect(record.options.budget).toBe(false);
  expect(record.html).toBe(snapshot);
  expect(record.html).not.toContain(trip.title);
});
it("선택한 내용만 제외하고 원본은 변경하지 않는다", () => {
  const trip = structuredClone(examples[0]);
  trip.summary = "PRIVATE_PROFILE";
  trip.days[0].activities[0].description = "PRIVATE_NOTE";
  trip.days[0].activities[0].kind = "숙박";
  trip.days[0].activities[0].title = "PRIVATE_HOTEL";
  trip.bases[0].neighborhood = "PRIVATE_NEIGHBORHOOD";
  const original = structuredClone(trip);
  const html = exportGuidebook(trip, {
    profile: false,
    details: false,
    lodging: false,
    budget: false,
  });
  for (const secret of [
    "PRIVATE_PROFILE",
    "PRIVATE_NOTE",
    "PRIVATE_HOTEL",
    "PRIVATE_NEIGHBORHOOD",
  ])
    expect(html).not.toContain(secret);
  expect(html).not.toContain('id="budget"');
  expect(html).not.toContain('href="#stay"');
  expect(html).toContain("숙박 정보 생략");
  expect(trip).toEqual(original);
  expect(exportGuidebook(trip, defaultExportOptions)).toContain(
    "PRIVATE_HOTEL",
  );
});
it("HTML에 외부 코드나 위험 링크를 삽입하지 않는다", () => {
  const t = structuredClone(examples[0]);
  t.title = "<script>alert(1)</script>";
  t.sources = [
    {
      id: "evil",
      title: "evil",
      url: "javascript:alert(1)",
      provider: "웹",
      checkedAt: "",
    },
  ];
  const html = exportGuidebook(t);
  expect(html).not.toContain("<script>");
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("<style>");
  expect(html).toContain("Content-Security-Policy");
});
