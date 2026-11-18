import { it, expect } from "vitest";
import { exportGuidebook } from "../src/lib/export";
import { examples } from "../src/lib/examples";
import { defaultExportOptions } from "../src/lib/export-options";
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
