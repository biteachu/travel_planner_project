import { photoSchema, placeSchema, type PlaceCandidate } from "./guide-visuals";
import { readLimitedBody } from "./request-body";
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
  const language = /[가-힣]/.test(query) ? "ko" : "en";
  const raw = await wiki(
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
  );
  const pages = (raw.query?.pages || [])
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
    const candidate = placeSchema.omit({ activityId: true, activityTitle: true, city: true }).safeParse({
      title: page.title,
      lat: c.lat,
      lon: c.lon,
      sourceUrl: page.fullurl,
    });
    if (candidate.success) candidates.push({ ...candidate.data, photo });
  }
  return candidates;
}
