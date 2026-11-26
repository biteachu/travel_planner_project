import type { PlaceCandidate } from "./guide-visuals";
export const placeName = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s·]/g, "")
    .trim();
export function routeSearchTerm(title: string) {
  // Prefer a named station to the surrounding narrative, hotel or meal activity.
  const station = title.match(
    /([가-힣A-Za-z0-9]+역)(?=\s|에서|으로|까지|을|의|$)/,
  );
  if (station) return station[1];
  return title
    .split(/\s+(?:주변|고가|골목|체크인|에서|방문|관람|산책)/)[0]
    .trim()
    .slice(0, 80);
}
export function routeCities(city: string) {
  return city
    .replace(/\([^)]*\)/g, "")
    .split(/[·→,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function routeCandidate(
  title: string,
  candidates: PlaceCandidate[],
  centers: PlaceCandidate[],
) {
  const term = placeName(routeSearchTerm(title));
  if (term.length < 3 || !centers.length) return undefined;
  // A city-wide or homonymous result must not silently become the activity location.
  return candidates
    .filter(
      (p) =>
        (placeName(p.title) === term ||
          placeName(p.title.split(",")[0]) === term) &&
        centers.some((c) => distanceKm(p, c) < 25),
    )
    .sort(
      (a, b) =>
        Math.min(...centers.map((c) => distanceKm(a, c))) -
        Math.min(...centers.map((c) => distanceKm(b, c))),
    )[0];
}
