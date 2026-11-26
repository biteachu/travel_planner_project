import { z } from "zod";
import { visualsSchema } from "./guide-visuals";

const text = z.string().max(5000);
const optionalTime = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/)
  .optional();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "유효한 날짜를 입력해 주세요");
export const fixedEventSchema = z.object({
  id: z.string().min(1).max(80),
  date,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.number().int().min(1).max(1440),
  title: z.string().trim().min(1).max(300),
  kind: z.enum(["관광", "식사", "이동", "휴식", "숙박"]),
});
export type FixedEvent = z.infer<typeof fixedEventSchema>;
export const briefSchema = z
  .object({
    country: z.string().min(1).max(100),
    cities: text,
    startDate: date,
    endDate: date,
    people: z.number().int().min(1).max(30),
    rooms: z.number().int().min(1).max(20),
    budget: z.number().positive().max(1e9),
    currency: z.enum(["KRW", "USD", "EUR", "JPY", "TRY"]),
    pace: z.enum(["여유롭게", "균형 있게", "알차게"]),
    interests: z.array(z.string().max(100)).max(20),
    preferences: text,
    additionalAnswers: text.optional(),
    avoid: text,
    arrival: text,
    departure: text,
    firstDayStart: optionalTime,
    lastDayEnd: optionalTime,
    reservations: text,
    fixedEvents: z.array(fixedEventSchema).max(50).optional(),
  })
  .refine((b) => b.endDate >= b.startDate, "종료일은 시작일 이후여야 합니다")
  .refine(
    (b) => dayCount(b.startDate, b.endDate) <= 31,
    "한 번에 최대 31일까지 계획할 수 있습니다",
  )
  .superRefine((brief, ctx) => {
    if (
      brief.startDate === brief.endDate &&
      brief.firstDayStart &&
      brief.lastDayEnd &&
      brief.firstDayStart >= brief.lastDayEnd
    )
      ctx.addIssue({
        code: "custom",
        message: "당일 여행의 활동 종료 시간은 시작 시간보다 늦어야 합니다.",
      });
    const ids = new Set<string>();
    for (const event of brief.fixedEvents || []) {
      if (ids.has(event.id))
        ctx.addIssue({
          code: "custom",
          message: "확정 일정 식별자가 중복되었습니다.",
        });
      ids.add(event.id);
      if (event.date < brief.startDate || event.date > brief.endDate)
        ctx.addIssue({
          code: "custom",
          message: `${event.title}: 확정 일정 날짜가 여행 기간 밖입니다.`,
        });
      const start = minutes(event.time);
      if (
        (event.date === brief.startDate &&
          brief.firstDayStart &&
          start < minutes(brief.firstDayStart)) ||
        (event.date === brief.endDate &&
          brief.lastDayEnd &&
          start + event.duration > minutes(brief.lastDayEnd))
      )
        ctx.addIssue({
          code: "custom",
          message: `${event.title}: 확정 일정이 활동 가능 시간 밖입니다.`,
        });
      if (start + event.duration > 1440)
        ctx.addIssue({
          code: "custom",
          message: `${event.title}: 자정을 넘는 확정 일정은 날짜별로 나눠 주세요.`,
        });
      if (
        (brief.fixedEvents || []).some(
          (other) =>
            other.id !== event.id &&
            other.date === event.date &&
            minutes(other.time) < start + event.duration &&
            minutes(other.time) + other.duration > start,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: `${event.title}: 확정 일정끼리 시간이 겹칩니다.`,
        });
    }
  });
export type Brief = z.infer<typeof briefSchema>;
export const conversionSchema = z.object({
  originalAmount: z.number().min(0).max(1e9),
  originalCurrency: z.enum(["KRW", "USD", "EUR", "JPY", "TRY"]),
  rate: z.number().positive().max(1e9),
  asOf: date,
  source: z.string().trim().min(1).max(500),
});
export function convertedAmount(
  amount: number,
  rate: number,
  currency: string,
) {
  const digits =
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** digits;
  return Math.round((amount * rate + Number.EPSILON) * scale) / scale;
}
export const sourceSchema = z.object({
  id: z.string().max(100),
  title: text,
  url: z.string().max(2000),
  provider: z.enum(["Google Maps", "Wikivoyage", "웹", "사용자", "예시"]),
  checkedAt: text,
  license: z.literal("CC BY-SA 4.0").optional(),
  attributionUrl: z.string().max(2000).optional(),
  revision: z.number().int().positive().optional(),
  revisedAt: z.string().max(100).optional(),
});
export const activitySchema = z.object({
  id: z.string().min(1).max(100),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.number().int().min(0).max(1440),
  title: z.string().min(1).max(300),
  kind: z.enum(["관광", "식사", "이동", "휴식", "숙박"]),
  description: text,
  reason: text,
  transport: text,
  cost: z.number().min(0).max(1e9).nullable(),
  costStatus: z.enum(["추정", "입력", "조회", "미확인"]),
  conversion: conversionSchema.optional(),
  locked: z.boolean(),
  sourceIds: z.array(z.string()).max(30),
  alternative: text,
});
export const daySchema = z.object({
  date,
  title: text,
  city: text,
  activities: z.array(activitySchema).max(30),
});
function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
export function fixedActivities(
  brief: Brief,
  date: string,
): z.infer<typeof activitySchema>[] {
  return (brief.fixedEvents || [])
    .filter((event) => event.date === date)
    .map((event) => ({
      id: `reserved-${event.id}`,
      time: event.time,
      duration: event.duration,
      title: event.title,
      kind: event.kind,
      locked: true,
      description: "사용자가 확정한 일정입니다.",
      reason: "확정 예약 보호",
      transport: "",
      cost: null,
      costStatus: "미확인",
      sourceIds: [],
      alternative: "",
    }));
}
export function fixedDayIssues(
  brief: Brief,
  day: z.infer<typeof daySchema>,
): string[] {
  return fixedActivities(brief, day.date).flatMap((expected) => {
    const actual = day.activities.find((a) => a.id === expected.id);
    const issues: string[] = [];
    if (
      !actual ||
      day.activities.filter((a) => a.id === expected.id).length !== 1 ||
      ["time", "duration", "title", "kind", "locked"].some(
        (key) =>
          actual[key as keyof typeof actual] !==
          expected[key as keyof typeof expected],
      )
    )
      issues.push(`고정 일정 '${expected.title}'이 누락되거나 변경되었습니다.`);
    const start = minutes(expected.time);
    if (
      day.activities.some(
        (a) =>
          a.id !== expected.id &&
          minutes(a.time) < start + expected.duration &&
          minutes(a.time) + a.duration > start,
      )
    )
      issues.push(
        `고정 일정 '${expected.title}'과 다른 활동의 시간이 겹칩니다.`,
      );
    return issues;
  });
}
export function dayConstraintIssues(
  brief: Brief,
  day: z.infer<typeof daySchema>,
): string[] {
  const issues = fixedDayIssues(brief, day);
  for (const activity of day.activities) {
    if (
      day.date === brief.startDate &&
      brief.firstDayStart &&
      minutes(activity.time) < minutes(brief.firstDayStart)
    )
      issues.push(
        `${day.date}: ${activity.title} 활동이 첫날 시작 가능 시간보다 이릅니다.`,
      );
    if (
      day.date === brief.endDate &&
      brief.lastDayEnd &&
      minutes(activity.time) + activity.duration > minutes(brief.lastDayEnd)
    )
      issues.push(
        `${day.date}: ${activity.title} 활동이 마지막 날 종료 시간 이후까지 이어집니다.`,
      );
  }
  return issues;
}
export const baseSchema = z.object({
  city: z.string().min(1).max(200),
  nights: z.number().int().min(0).max(30),
  reason: text,
  neighborhood: text,
});
export const outlineSchema = z.object({
  title: text,
  summary: text,
  bases: z.array(baseSchema).min(1).max(15),
  questions: z.array(text).max(5),
});
export type Outline = z.infer<typeof outlineSchema>;
export const recommendationSchema = z.object({
  kind: z.enum(["식당", "숙박 지역", "숙소"]),
  city: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  reason: text,
  tradeoff: text,
  checks: z.array(text).max(8),
  sourceIds: z.array(z.string().max(200)).max(20),
});
export const tripSchema = z.object({
  visuals: visualsSchema.optional(),
  id: z.string().min(1).max(100),
  version: z.number().int().positive(),
  title: z.string().min(1).max(300),
  summary: text,
  brief: briefSchema,
  bases: z.array(baseSchema).max(15),
  days: z.array(daySchema).min(1).max(31),
  tips: z.array(text).max(30),
  recommendations: z.array(recommendationSchema).max(90).optional(),
  stories: z
    .array(
      z.object({ title: text, body: text, sourceIds: z.array(z.string()) }),
    )
    .max(30),
  sources: z.array(sourceSchema).max(300),
  warnings: z.array(text).max(100),
  status: z.enum(["초안", "확인 필요", "검토 완료"]),
  isExample: z.boolean(),
  updatedAt: text,
});
export type Trip = z.infer<typeof tripSchema>;
export type Activity = z.infer<typeof activitySchema>;
export function preserveUserConversions(
  activities: Activity[],
  previous: Activity[] = [],
): Activity[] {
  return activities.map((activity) => {
    const { conversion: _, ...rest } = activity;
    const old = previous.find((item) => item.id === activity.id);
    return old?.conversion && old.cost === activity.cost
      ? {
          ...rest,
          costStatus: old.costStatus,
          conversion: structuredClone(old.conversion),
        }
      : rest;
  });
}
export function dayCount(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}
export function datesBetween(start: string, end: string) {
  return Array.from(
    { length: Math.max(0, Math.min(31, dayCount(start, end))) },
    (_, i) =>
      new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10),
  );
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:"
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function mapUrl(name: string) {
  return (
    "https://www.google.com/maps/search/?api=1&hl=ko&query=" +
    encodeURIComponent(name)
  );
}
export function money(n: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
  }).format(n);
}
export function costSummary(t: Trip) {
  const a = t.days.flatMap((d) => d.activities);
  return {
    known: a.reduce((sum, x) => sum + (x.cost ?? 0), 0),
    knownCount: a.filter((x) => x.cost !== null).length,
    unknown: a.filter((x) => x.cost === null).length,
  };
}
export function categoryCosts(t: Trip) {
  return (["숙박", "식사", "관광", "이동", "휴식"] as const).map((kind) => {
    const items = t.days
      .flatMap((d) => d.activities)
      .filter((a) => a.kind === kind);
    return {
      kind,
      total: items.reduce((n, a) => n + (a.cost ?? 0), 0),
      known: items.filter((a) => a.cost !== null).length,
      unknown: items.filter((a) => a.cost === null).length,
    };
  });
}
export function validateTrip(t: Trip, previous?: Trip): string[] {
  const issues: string[] = [];
  const expected = datesBetween(t.brief.startDate, t.brief.endDate);
  const actual = t.days.map((d) => d.date);
  if (new Set(actual).size !== actual.length)
    issues.push("중복된 여행 날짜가 있습니다.");
  if (
    expected.length !== actual.length ||
    expected.some((d) => !actual.includes(d))
  )
    issues.push("여행 기간과 날짜별 일정이 일치하지 않습니다.");
  if (t.bases.reduce((n, b) => n + b.nights, 0) !== expected.length - 1)
    issues.push("숙박 일수 합계를 확인해 주세요.");
  const ids = new Set<string>();
  for (const story of t.stories) {
    if (story.sourceIds.some((id) => !t.sources.some((s) => s.id === id)))
      issues.push(`${story.title}: 연결되지 않은 출처가 있습니다.`);
  }
  for (const candidate of t.recommendations || []) {
    if (candidate.sourceIds.some((id) => !t.sources.some((s) => s.id === id)))
      issues.push(`${candidate.name}: 연결되지 않은 출처가 있습니다.`);
    if (!candidate.sourceIds.length)
      issues.push(`${candidate.name}: 후보의 근거를 확인해 주세요.`);
  }
  for (const d of t.days) {
    issues.push(...dayConstraintIssues(t.brief, d));
    let lastEnd = 0;
    for (const a of [...d.activities].sort((a, b) =>
      a.time.localeCompare(b.time),
    )) {
      const [h, m] = a.time.split(":").map(Number);
      const start = h * 60 + m;
      if (start < lastEnd)
        issues.push(`${d.date}: ${a.title} 시간이 겹칩니다.`);
      lastEnd = Math.max(lastEnd, start + a.duration);
      if (lastEnd > 1440)
        issues.push(`${d.date}: 자정을 넘는 일정은 다음 날짜로 나눠 주세요.`);
      if (ids.has(a.id)) issues.push("활동 식별자가 중복되었습니다.");
      ids.add(a.id);
      if (a.sourceIds.some((id) => !t.sources.some((s) => s.id === id)))
        issues.push(`${a.title}: 연결되지 않은 출처가 있습니다.`);
      if (
        a.conversion &&
        a.cost !==
          convertedAmount(
            a.conversion.originalAmount,
            a.conversion.rate,
            t.brief.currency,
          )
      )
        issues.push(`${a.title}: 환산 기록과 비용이 일치하지 않습니다.`);
    }
  }
  if (previous) {
    for (const d of previous.days)
      for (const a of d.activities.filter((a) => a.locked)) {
        const n = t.days
          .find((x) => x.date === d.date)
          ?.activities.find((x) => x.id === a.id);
        if (!n || JSON.stringify(n) !== JSON.stringify(a))
          issues.push(`고정 일정 '${a.title}'이 변경되었습니다.`);
      }
  }
  if (costSummary(t).known > t.brief.budget)
    issues.push("현재 계산된 경비가 총예산을 초과합니다.");
  return [...new Set(issues)];
}
