import type { GuidePlace } from "./guide-visuals";
export type TravelMode = "" | "walking" | "transit" | "driving";
export function googleMapViews(
  points: GuidePlace[],
  key: string,
  mode: TravelMode = "",
) {
  const stops = points.filter(
    (p, i) =>
      i === 0 || p.lat !== points[i - 1].lat || p.lon !== points[i - 1].lon,
  );
  if (!key || !stops.length) return [];
  if (stops.length === 1) {
    const p = stops[0];
    const params = new URLSearchParams({
      key,
      language: "ko",
      center: `${p.lat},${p.lon}`,
      zoom: "15",
    });
    return [
      {
        label: `${p.title} 주변`,
        url: `https://www.google.com/maps/embed/v1/view?${params}`,
      },
    ];
  }
  return stops.slice(1).map((p, i) => {
    const from = stops[i];
    const params = new URLSearchParams({
      key,
      language: "ko",
      origin: `${from.lat},${from.lon}`,
      destination: `${p.lat},${p.lon}`,
      units: "metric",
      ...(mode ? { mode } : {}),
    });
    return {
      label: `${i + 1}구간 · ${from.title} → ${p.title}`,
      url: `https://www.google.com/maps/embed/v1/directions?${params}`,
    };
  });
}
export function koreanGooglePlace(point: GuidePlace) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", hl: "ko", query: `${point.lat},${point.lon}` })}`;
}
