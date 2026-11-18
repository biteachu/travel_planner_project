import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { runAgent, stageSchema } from "../../../lib/agents";
export const runtime = "nodejs";
export const maxDuration = 240;
const windows = new Map<
  string,
  { count: number; start: number; active: number }
>();
const input = z.object({
  key: z.string().min(15).max(300),
  stage: stageSchema,
  payload: z.unknown(),
});
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "허용되지 않은 요청 출처입니다." },
      { status: 403, headers },
    );
  let slot: { count: number; start: number; active: number } | undefined;
  let acquired = false;
  try {
    const body = await request.text();
    if (body.length > 350000)
      return NextResponse.json(
        { error: "여행 데이터가 너무 큽니다. 구간을 줄여 주세요." },
        { status: 413, headers },
      );
    const parsed = input.parse(JSON.parse(body));
    const hash = createHash("sha256").update(parsed.key).digest("hex");
    const now = Date.now();
    for (const [k, v] of windows) {
      if (now - v.start > 60000 && v.active === 0) windows.delete(k);
    }
    slot = windows.get(hash);
    if (!slot) {
      slot = { count: 0, start: now, active: 0 };
      windows.set(hash, slot);
    }
    if (slot.active >= 1 || slot.count >= 15)
      return NextResponse.json(
        {
          error:
            "요청이 진행 중이거나 잠시 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429, headers },
      );
    slot.count++;
    slot.active++;
    acquired = true;
    const result = await runAgent(
      parsed.key,
      parsed.stage,
      parsed.payload,
      request.signal,
    );
    return NextResponse.json(result, { headers });
  } catch (e) {
    // Never return provider error text: it can include request content or credentials.
    const status = (e as { status?: number }).status;
    const invalid = e instanceof z.ZodError || e instanceof SyntaxError;
    const message = e instanceof Error ? e.message : "";
    const error = invalid
      ? "입력 또는 AI 응답 형식이 올바르지 않습니다. 조건을 확인하고 다시 시도해 주세요."
      : message === "EVIDENCE_REFERENCE_INVALID"
        ? "조사 자료에 없는 출처를 참조한 응답입니다. 다시 시도해 주세요."
        : message === "CONSTRAINT_VIOLATION"
          ? "확정 예약 또는 활동 가능 시간을 지키지 않은 일정입니다. 조건을 확인하고 다시 시도해 주세요."
          : message === "LOCKED_CHANGED"
            ? "고정 일정이 변경된 수정안은 적용할 수 없습니다."
            : message === "ABORTED"
              ? "요청을 중단했습니다."
              : status === 401 || status === 403
                ? "API 키와 모델 사용 권한을 확인해 주세요."
                : status === 429
                  ? "Google 사용량 한도에 도달했습니다. 요금·할당량을 확인해 주세요."
                  : "AI 요청을 완료하지 못했습니다. 키·모델 권한·네트워크를 확인하고 다시 시도해 주세요.";
    return NextResponse.json(
      { error },
      { status: invalid ? 400 : status === 429 ? 429 : 502, headers },
    );
  } finally {
    if (slot && acquired) slot.active = Math.max(0, slot.active - 1);
  }
}
