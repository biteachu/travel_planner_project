import { z } from "zod";
import type { GroundingMetadata } from "@google/genai";
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

export function groundingSupports(
  metadata: GroundingMetadata | undefined,
  sourceIds: string[],
) {
  const known = new Set(sourceIds);
  return (metadata?.groundingSupports || [])
    .slice(0, 100)
    .flatMap((support) => {
      const text = support.segment?.text?.slice(0, 5000);
      const ids = [
        ...new Set(
          (support.groundingChunkIndices || [])
            .map((index) => `source-${index}`)
            .filter((id) => known.has(id)),
        ),
      ];
      return text && ids.length ? [{ text, sourceIds: ids }] : [];
    });
}
export function hasUnknownSources(
  items: { sourceIds: string[] }[],
  sources: { id: string }[],
) {
  const known = new Set(sources.map((s) => s.id));
  return items.some((item) => item.sourceIds.some((id) => !known.has(id)));
}
