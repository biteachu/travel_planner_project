import { z } from "zod";
import { researchSchema } from "./research";
import { readLimitedBody } from "./request-body";

export const researchTitlesSchema = z
  .array(
    z
      .string()
      .min(1)
      .max(200)
      .regex(/^[^|:#\r\n]+$/),
  )
  .min(1)
  .max(3);
const pageSchema = z.object({
  pageid: z.number().int().positive().optional(),
  title: z.string().max(500),
  missing: z.boolean().optional(),
  pageprops: z.object({ disambiguation: z.string().optional() }).optional(),
  extract: z.string().max(1000000).optional(),
  revisions: z
    .array(
      z.object({ revid: z.number().int().positive(), timestamp: z.string() }),
    )
    .optional(),
});

// Keep useful sections from the entire guide, not only its introductory paragraphs.
export function selectTravelSections(text: string) {
  const sections = text.split(/(?=^== [^=\n]+ ==\s*$)/m);
  const wanted =
    /^(?:== (?:Understand|Get in|Get around|See|Do|Eat|Drink|Sleep|Go next) ==)/;
  const chosen = sections.filter(
    (section, index) => index === 0 || wanted.test(section),
  );
  const perSection = Math.min(
    4500,
    Math.floor(28000 / Math.max(chosen.length, 1)),
  );
  return chosen.map((section) => section.slice(0, perSection)).join("\n\n");
}

export async function researchWikivoyage(
  titles: string[],
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const checked = [...new Set(researchTitlesSchema.parse(titles))];
  const pages: z.infer<typeof pageSchema>[] = [];
  // Full extracts are retrieved one page at a time; multi-page queries can return only one extract.
  for (const title of checked) {
    signal.throwIfAborted();
    const url = new URL("https://en.wikivoyage.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "extracts|revisions|pageprops",
      ppprop: "disambiguation",
      explaintext: "1",
      exlimit: "1",
      rvprop: "ids|timestamp",
      titles: title,
      maxlag: "5",
    }).toString();
    try {
      const response = await fetcher(url, {
        headers: {
          "User-Agent":
            "TravelPlannerProject/0.1 (https://github.com/biteachu/travel_planner_project)",
          Accept: "application/json",
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
        redirect: "error",
      });
      if (!response.ok) throw new Error("OPEN_RESEARCH_UNAVAILABLE");
      const raw = JSON.parse(await readLimitedBody(response, 3000000));
      if (raw.error) throw new Error("OPEN_RESEARCH_UNAVAILABLE");
      pages.push(...z.array(pageSchema).max(1).parse(raw.query?.pages));
    } catch {
      signal.throwIfAborted();
      throw new Error("OPEN_RESEARCH_UNAVAILABLE");
    }
  }
  const sources: z.infer<typeof researchSchema>["sources"] = [];
  const parts: string[] = [];
  for (const page of pages) {
    const revision = page.revisions?.[0];
    if (page.pageprops?.disambiguation !== undefined) {
      parts.push(
        `[${page.title}] 같은 이름의 여러 장소를 나열한 안내 문서입니다. 이 문서를 특정 여행지의 근거로 사용하지 말고, 국가·지역이 명시된 문서가 필요함을 안내하세요.`,
      );
      continue;
    }
    if (page.missing || !page.pageid || !page.extract?.trim() || !revision) {
      parts.push(
        `[${page.title}] 공개 여행 안내 자료를 찾지 못했습니다. 장소·업체·가격을 만들어 채우지 마세요.`,
      );
      continue;
    }
    const id = `wv-${page.pageid}`;
    if (sources.some((source) => source.id === id)) continue;
    sources.push({
      id,
      title: `${page.title} — Wikivoyage`,
      provider: "Wikivoyage",
      url: `https://en.wikivoyage.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${revision.revid}`,
      checkedAt: new Date().toISOString().slice(0, 10),
      license: "CC BY-SA 4.0",
      attributionUrl: `https://en.wikivoyage.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`,
      revision: revision.revid,
      revisedAt: revision.timestamp,
    });
    parts.push(
      `[SOURCE ${id}; ${page.title}; revision ${revision.revid}; modified ${revision.timestamp}; CC BY-SA 4.0; Wikivoyage contributors]\n${selectTravelSections(page.extract)}\n[일부 본문만 발췌했습니다. 조회는 현재 영업·가격 확인이 아닙니다. 원문의 도시·국가가 여행 조건과 같은지 확인하고 불일치 시 사용하지 마세요.]`,
    );
  }
  signal.throwIfAborted();
  return researchSchema.parse({
    text: parts.join("\n\n"),
    sources,
    method: "Wikivoyage · CC BY-SA 4.0",
    supports: [],
  });
}
