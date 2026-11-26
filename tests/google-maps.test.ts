import { expect, it } from "vitest";
import { googleMapViews, koreanGooglePlace } from "../src/lib/google-maps";
const p = {
  activityId: "a",
  activityTitle: "산책",
  city: "오사카",
  title: "후쿠시마역",
  lat: 34.696,
  lon: 135.488,
  sourceUrl: "https://ko.wikipedia.org/wiki/Test",
};
it("requests Korean Google maps and collapses consecutive duplicate coordinates", () => {
  const views = googleMapViews([p, { ...p, activityId: "b" }], "test");
  expect(views).toHaveLength(1);
  const url = new URL(views[0].url);
  expect(url.pathname).toBe("/maps/embed/v1/view");
  expect(url.searchParams.get("language")).toBe("ko");
  expect(url.searchParams.get("center")).toBe("34.696,135.488");
});
it("preserves returning routes and offers separate real route segments", () => {
  const views = googleMapViews([p, { ...p, lat: 34.7 }, p], "test", "transit");
  expect(views).toHaveLength(2);
  expect(new URL(views[0].url).searchParams.get("mode")).toBe("transit");
  expect(new URL(views[1].url).searchParams.get("destination")).toBe(
    "34.696,135.488",
  );
});
it("never builds keyless embed URLs and provides a Korean Maps link", () => {
  expect(googleMapViews([p], "")).toEqual([]);
  expect(new URL(koreanGooglePlace(p)).searchParams.get("hl")).toBe("ko");
});
