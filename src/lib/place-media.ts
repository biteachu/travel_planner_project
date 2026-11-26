import { photoSchema, placeSchema, type PlaceCandidate } from "./guide-visuals";
import { readLimitedBody } from "./request-body";
import {
  placeName,
  routeCities,
  routeSearchTerm,
  routeCandidate,
} from "./route-location";

export async function findRoutePlace(
  title: string,
  city: string,
  signal?: AbortSignal,
  photos = false,
  aliases: string[] = [],
) {
  const cities = routeCities(city);
  const centers: PlaceCandidate[] = [];
  const candidates: PlaceCandidate[] = [];
  for (const name of cities) {
    const matches = await findPlaces(name, name, signal, false);
    const center = matches.find(
      (p) =>
        placeName(p.title).replace(/[시市]$/, "") ===
        placeName(name).replace(/[시市]$/, ""),
    );
    if (!center) continue;
    centers.push(center);
    candidates.push(
      ...(await findPlaces(
        `${name} ${routeSearchTerm(title)}`,
        name,
        signal,
        false,
      )),
    );
  }
  if (!centers.length) return [];
  let match = routeCandidate(title, candidates, centers);
  async function attachPhoto(candidate: PlaceCandidate) {
    const exact = await findPlaces(candidate.title, city, signal, true);
    const matched = exact.find((p) => p.sourceUrl === candidate.sourceUrl);
    return matched?.photo ? { ...candidate, photo: matched.photo } : undefined;
  }
  if (match && !photos) return [match];
  if (match && photos) {
    const photographed = await attachPhoto(match);
    if (photographed) return [photographed];
  }
  // Search each explicit canonical name in its own language. Prefixing an
  // English name with a Korean city would incorrectly force the Korean wiki.
  for (const alias of [...new Set([title, ...aliases])].slice(0, 4)) {
    const found = await findPlaces(alias, city, signal, false);
    const candidate = routeCandidate(alias, found, centers);
    if (!candidate) continue;
    match ??= candidate;
    if (!photos) return [candidate];
    const photographed = await attachPhoto(candidate);
    if (photographed) return [photographed];
  }
  return match ? [match] : [];
}
const headers = {
  "User-Agent":
    "TravelPlannerProject/0.2 (https://github.com/biteachu/travel_planner_project)",
};
async function wiki(
  host: string,
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    ...params,
  }).toString();
  const response = await fetch(url, {
    headers,
    next: { revalidate: 86400 },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error("공개 여행 사진·위치 자료에 연결하지 못했습니다.");
  return JSON.parse(await readLimitedBody(response, 500000));
}
const clean = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
export async function commonsPhoto(
  file: string,
  city: string,
  title: string,
  signal?: AbortSignal,
) {
  const raw = await wiki(
    "commons.wikimedia.org",
    {
      prop: "imageinfo",
      titles: `File:${file}`,
      iiprop: "url|extmetadata",
      iiurlwidth: "1000",
    },
    signal,
  );
  const info = raw.query?.pages?.[0]?.imageinfo?.[0];
  const meta = info?.extmetadata;
  const license = clean(meta?.LicenseShortName?.value);
  if (
    !info ||
    (!meta?.LicenseUrl?.value && license !== "Public domain") ||
    !/^(CC BY(?:-SA)? [234]\.0|CC0(?: 1\.0)?|Public domain)$/.test(license)
  )
    return undefined;
  const result = photoSchema.safeParse({
    city,
    title,
    file,
    url: info.thumburl || info.url,
    sourceUrl: info.descriptionurl,
    credit: clean(meta?.Artist?.value),
    license,
    licenseUrl: (
      meta?.LicenseUrl?.value ||
      "https://creativecommons.org/publicdomain/mark/1.0/"
    ).replace(/^http:/, "https:"),
  });
  return result.success && result.data.credit ? result.data : undefined;
}
export async function findPlaces(
  query: string,
  city: string,
  signal?: AbortSignal,
  photos = true,
): Promise<PlaceCandidate[]> {
  const languages = /[가-힣]/.test(query)
    ? ["ko"]
    : /[ぁ-ゖァ-ヺ]/.test(query)
      ? ["ja"]
      : /[一-龯]/.test(query)
        ? ["ja", "zh"]
        : ["en"];
  const results = await Promise.all(
    languages.map((language) =>
      wiki(
        `${language}.wikipedia.org`,
        {
          generator: "search",
          gsrsearch: query,
          gsrlimit: "5",
          gsrnamespace: "0",
          prop: "coordinates|pageimages|info|pageprops",
          inprop: "url",
          piprop: "name",
          pilicense: "free",
          ppprop: "disambiguation",
        },
        signal,
      ),
    ),
  );
  const pages = results
    .flatMap((raw) => raw.query?.pages || [])
    .filter(
      (p: {
        coordinates?: unknown[];
        pageprops?: { disambiguation?: unknown };
      }) => p.coordinates?.length && p.pageprops?.disambiguation === undefined,
    )
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index);
  const candidates: PlaceCandidate[] = [];
  for (const page of pages.slice(0, 3)) {
    const c = page.coordinates[0];
    if (c.globe !== "earth" || Math.abs(c.lat) > 85) continue;
    let photo;
    if (photos && page.pageimage)
      photo = await commonsPhoto(
        page.pageimage,
        city,
        page.title,
        signal,
      ).catch(() => undefined);
    const candidate = placeSchema
      .omit({ activityId: true, activityTitle: true, city: true })
      .safeParse({
        title: page.title,
        lat: c.lat,
        lon: c.lon,
        sourceUrl: page.fullurl,
      });
    if (candidate.success) candidates.push({ ...candidate.data, photo });
  }
  return candidates;
}
