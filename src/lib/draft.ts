import { z } from "zod";
import { briefSchema } from "./trip";

export const draftKey = "travel-brief-v1";
// Drafts intentionally allow unfinished dates and zero-valued numeric inputs.
// Generation still requires the stricter briefSchema.
export const draftSchema = z.object({
  brief: z.object({
    ...briefSchema.shape,
    country: z.string().max(100),
    startDate: z.string().max(10),
    endDate: z.string().max(10),
    people: z.number().int().min(0).max(30),
    rooms: z.number().int().min(0).max(20),
    budget: z.number().min(0).max(1e9),
  }),
  step: z.number().int().min(0).max(2),
});

export function readDraft(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function encodeDraft(input: unknown) {
  return JSON.stringify(draftSchema.parse(input));
}
