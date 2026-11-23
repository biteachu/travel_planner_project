import { z } from "zod";

import { sourceSchema } from "./trip";

export const researchSchema = z.object({
  text: z.string().max(100000),
  sources: z.array(sourceSchema).max(300),
  method: z.string().max(100),
  supports: z
    .array(
      z.object({
        text: z.string().max(5000),
        sourceIds: z.array(z.string()).max(300),
      }),
    )
    .max(100)
    .optional(),
});

export function hasUnknownSources(
  items: { sourceIds: string[] }[],
  sources: { id: string }[],
) {
  const known = new Set(sources.map((s) => s.id));
  return items.some((item) => item.sourceIds.some((id) => !known.has(id)));
}

export function mergeResearch(
  previous: z.infer<typeof researchSchema> | null,
  incoming: z.infer<typeof researchSchema>,
  city: string,
  index: number,
  total: number,
) {
  // Allocate space across all bases so later cities retain evidence too.
  const sourceLimit = Math.max(1, Math.floor(300 / total));
  const sources = incoming.sources
    .slice(0, sourceLimit)
    .map((source) => ({ ...source, id: `base-${index}-${source.id}` }));
  const available = new Set(sources.map((source) => source.id));
  const supports = (incoming.supports || [])
    .slice(0, Math.floor(100 / total))
    .flatMap((support) => {
      const sourceIds = support.sourceIds
        .map((id) => `base-${index}-${id}`)
        .filter((id) => available.has(id));
      return sourceIds.length
        ? [{ text: support.text.slice(0, 1000), sourceIds }]
        : [];
    });
  const textLimit = Math.floor(90000 / total);
  const remappedText = incoming.sources.reduce(
    (text, source) =>
      text.replaceAll(
        `[SOURCE ${source.id};`,
        `[SOURCE base-${index}-${source.id};`,
      ),
    incoming.text,
  );
  const truncated =
    incoming.text.length > textLimit ||
    incoming.sources.length > sourceLimit ||
    (incoming.supports || []).length > Math.floor(100 / total);
  const sections = remappedText
    .split(/(?=^\[SOURCE |^== [^=\n]+ ==\s*$)/m)
    .filter(Boolean);
  const sectionBudget = Math.max(
    1,
    Math.floor(textLimit / Math.max(1, sections.length)) - 2,
  );
  const balancedText = sections
    .map((section) => section.slice(0, sectionBudget))
    .join("\n\n")
    .slice(0, textLimit);
  return researchSchema.parse({
    text: [
      previous?.text,
      `\n[${city}]\n${balancedText}${truncated ? "\n[일부 조사 자료는 길이 제한으로 생략되었습니다. 포함된 출처만 사용하고 부족한 정보는 확인 필요로 표시하세요.]" : ""}`,
    ]
      .filter(Boolean)
      .join("\n"),
    sources: [...(previous?.sources || []), ...sources],
    supports: [...(previous?.supports || []), ...supports],
    method: [
      ...new Set([...(previous?.method.split(" + ") || []), incoming.method]),
    ]
      .join(" + ")
      .slice(0, 100),
  });
}
