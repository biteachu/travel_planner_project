import { z } from "zod";
import type { Trip } from "./trip";
const wikiUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /(^|\.)wikipedia\.org$|^commons\.wikimedia\.org$/.test(url.hostname)
    );
  });
export const photoSchema = z.object({
  city: z.string().max(200),
  title: z.string().max(300),
  file: z.string().max(500),
  url: z
    .string()
    .url()
    .max(2000)
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(u.hostname)
      );
    }),
  sourceUrl: wikiUrl,
  credit: z.string().max(3000),
  license: z.string().max(100),
  licenseUrl: z
    .string()
    .url()
    .max(1000)
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        ["creativecommons.org", "commons.wikimedia.org"].includes(u.hostname)
      );
    }),
});
export const placeSchema = z.object({
  reference: z.boolean().optional(),
  activityId: z.string().max(100),
  activityTitle: z.string().max(300),
  city: z.string().max(200),
  title: z.string().max(300),
  lat: z.number().min(-85).max(85),
  lon: z.number().min(-180).max(180),
  sourceUrl: wikiUrl,
});
export const visualsSchema = z.object({
  photos: z.array(photoSchema).max(15),
  places: z.array(placeSchema).max(300),
});
export type GuidePhoto = z.infer<typeof photoSchema>;
export type GuidePlace = z.infer<typeof placeSchema>;
export type Visuals = z.infer<typeof visualsSchema>;
export type PlaceCandidate = {
  title: string;
  lat: number;
  lon: number;
  sourceUrl: string;
  photo?: GuidePhoto;
};
export function dayPlaces(trip: Trip, index: number, lodging = true) {
  const day = trip.days[index];
  return day.activities.flatMap((a, i) => {
    if (!lodging && a.kind === "숙박") return [];
    const place = trip.visuals?.places.find(
      (p) =>
        p.activityId === a.id &&
        p.activityTitle === a.title &&
        p.city === day.city,
    );
    return place ? [{ ...place, number: i + 1 }] : [];
  });
}
export function directionsLinks(trip: Trip, index: number, lodging = true) {
  const day = trip.days[index];
  const stops = day.activities
    .filter(
      (a) =>
        (lodging || a.kind !== "숙박") && !["휴식", "이동"].includes(a.kind),
    )
    .map((a) => {
      const point = trip.visuals?.places.find(
        (p) =>
          p.activityId === a.id &&
          p.activityTitle === a.title &&
          p.city === day.city,
      );
      return point
        ? `${point.lat},${point.lon}`
        : `${trip.brief.country} ${day.city} ${a.title}`;
    });
  const links: { url: string; label: string }[] = [];
  // Mobile Maps URLs support at most three intermediate waypoints. Segments
  // overlap at their endpoint so no leg is silently dropped.
  for (let start = 0; start < stops.length - 1;) {
    let end = Math.min(start + 4, stops.length - 1);
    let url: URL;
    do {
      url = new URL("https://www.google.com/maps/dir/");
      url.search = new URLSearchParams({
        api: "1",
        origin: stops[start],
        destination: stops[end],
        ...(end > start + 1
          ? { waypoints: stops.slice(start + 1, end).join("|") }
          : {}),
      }).toString();
      if (url.href.length <= 2048 || end === start + 1) break;
      end--;
    } while (true);
    if (url.href.length <= 2048)
      links.push({
        url: url.href,
        label: `Google Maps 길찾기 · ${start + 1}–${end + 1}번`,
      });
    start = end;
  }
  return links;
}
export function compactText(value: string, limit = 110) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? text.slice(0, limit).trimEnd() + "…" : text;
}
