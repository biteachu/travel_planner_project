import { expect, it } from "vitest";
import {
  routeSearchTerm,
  routeCities,
  routeCandidate,
} from "../src/lib/route-location";
const p = (title: string, lat: number, lon: number) => ({
  title,
  lat,
  lon,
  sourceUrl: "https://ko.wikipedia.org/wiki/Test",
});
it("extracts station names from narrative activities", () => {
  expect(routeSearchTerm("후쿠시마역 주변 숙소 체크인·휴식")).toBe(
    "후쿠시마역",
  );
  expect(routeSearchTerm("후쿠시마역 고가에서 옆 골목으로")).toBe("후쿠시마역");
  expect(routeCities("오사카 → 교토(데마치 숙박)")).toEqual(["오사카", "교토"]);
});
it("matches disambiguated names near the destination and rejects far-away coordinates", () => {
  const center = p("오사카시", 34.69375, 135.50211);
  const far = p("후쿠시마역 (서일본 여객철도)", 34.414966, 135.291169);
  const near = p("후쿠시마역 (한신 전기철도)", 34.69611, 135.48833);
  expect(
    routeCandidate("후쿠시마역 고가에서 옆 골목으로", [far, near], [center]),
  ).toEqual(near);
  expect(
    routeCandidate("후쿠시마역 주변 숙소", [far], [center]),
  ).toBeUndefined();
});
it("does not invent a location for unnamed restaurants or use an entire city as a stop", () => {
  expect(
    routeCandidate(
      "동네 가게에서 도테야키로 저녁 시작",
      [p("오사카시", 34.69, 135.5)],
      [p("오사카시", 34.69, 135.5)],
    ),
  ).toBeUndefined();
  expect(
    routeCandidate("후쿠시마역 주변 숙소", [p("후쿠시마역", 34.69, 135.5)], []),
  ).toBeUndefined();
});
