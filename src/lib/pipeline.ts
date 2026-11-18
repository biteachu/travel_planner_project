import { z } from "zod";
import {
  briefSchema,
  outlineSchema,
  daySchema,
  tripSchema,
  datesBetween,
  validateTrip,
  dayConstraintIssues,
  type Brief,
  type Outline,
  type Trip,
} from "./trip";

import { researchSchema, hasUnknownSources } from "./research";
export const checkpointSchema = z.object({
  brief: briefSchema,
  outline: outlineSchema,
  research: researchSchema.nullable(),
  days: z.array(daySchema).max(31),
  trip: tripSchema.nullable(),
  phase: z.enum(["research", "days", "budget", "curate", "review", "complete"]),
  id: z.string().max(100),
});
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type AgentCaller = (stage: string, payload: unknown) => Promise<unknown>;
export function createCheckpoint(brief: Brief, outline: Outline): Checkpoint {
  return checkpointSchema.parse({
    brief,
    outline,
    research: null,
    days: [],
    trip: null,
    phase: "research",
    id: crypto.randomUUID(),
  });
}
export async function advancePipeline(
  current: Checkpoint,
  call: AgentCaller,
): Promise<Checkpoint> {
  const state = checkpointSchema.parse(structuredClone(current));
  if (state.phase === "research") {
    state.research = researchSchema.parse(
      await call("research", { brief: state.brief, outline: state.outline }),
    );
    state.phase = "days";
    return state;
  }
  if (state.phase === "days") {
    const dates = datesBetween(state.brief.startDate, state.brief.endDate);
    const date = dates.find((d) => !state.days.some((x) => x.date === d));
    if (date) {
      const response = await call("day", {
        brief: state.brief,
        outline: state.outline,
        research: state.research,
        date,
        previousDays: state.days.map((d) => ({
          date: d.date,
          city: d.city,
          places: d.activities.map((a) => a.title),
        })),
      });
      const day = z.object({ result: daySchema }).parse(response).result;
      if (day.date !== date)
        throw new Error(
          "요청한 날짜와 다른 일정이 반환되었습니다. 다시 시도해 주세요.",
        );
      const fixedIssues = dayConstraintIssues(state.brief, day);
      if (fixedIssues.length)
        throw new Error(fixedIssues.join(" ") + " 다시 시도해 주세요.");
      if (hasUnknownSources(day.activities, state.research?.sources || []))
        throw new Error(
          "조사 자료에 없는 출처를 참조한 일정입니다. 다시 시도해 주세요.",
        );
      state.days.push(day);
    }
    if (state.days.length === dates.length) {
      state.trip = tripSchema.parse({
        id: state.id,
        version: 1,
        title: state.outline.title,
        summary: state.outline.summary,
        brief: state.brief,
        bases: state.outline.bases,
        days: state.days,
        stories: [],
        tips: [],
        sources: state.research?.sources || [],
        warnings: ["운영시간·이동·비용은 출발 전에 다시 확인해 주세요."],
        status: "확인 필요",
        isExample: false,
        updatedAt: new Date().toISOString(),
      });
      state.trip.warnings.push(...validateTrip(state.trip));
      state.phase = "budget";
    }
    return state;
  }
  if (
    state.phase === "budget" ||
    state.phase === "curate" ||
    state.phase === "review"
  ) {
    const response = await call(state.phase, {
      trip: state.trip,
      research: state.research,
    });
    const next = z.object({ result: tripSchema }).parse(response).result;
    if (hasUnknownSources(next.stories, state.research?.sources || []))
      throw new Error(
        "조사 자료에 없는 출처를 참조한 설명입니다. 다시 시도해 주세요.",
      );
    state.trip = next;
    state.phase =
      state.phase === "budget"
        ? "curate"
        : state.phase === "curate"
          ? "review"
          : "complete";
    return state;
  }
  return state;
}
export function pipelineLabel(s: Checkpoint) {
  if (s.phase === "research")
    return "장소 조사: 취향에 맞는 자료를 찾고 있습니다";
  if (s.phase === "days")
    return `일정 구성: ${s.days.length + 1}일차 / ${datesBetween(s.brief.startDate, s.brief.endDate).length}일`;
  if (s.phase === "budget") return "예산: 경비 누락과 초과를 확인하고 있습니다";
  if (s.phase === "curate") return "큐레이터: 현지 이야기를 정리하고 있습니다";
  if (s.phase === "review") return "검토: 일정과 출처를 확인하고 있습니다";
  return "가이드북 생성 완료";
}
