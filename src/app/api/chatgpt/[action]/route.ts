import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  localEnabled,
  getLocalSession,
  sessionCookie,
  connectionStatus,
  startSignIn,
  listModels,
  selectModel,
  accessToken,
  acknowledge,
  signOut,
} from "../../../../lib/chatgpt-local";
import { createChatGPTSession } from "../../../../lib/chatgpt";
import { runAgent, stageSchema } from "../../../../lib/agents";
import { readLimitedBody } from "../../../../lib/request-body";
import { assertNoBookingReferences } from "../../../../lib/booking-privacy";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    LOCAL_ONLY: "ChatGPT 구독 연결은 PC 로컬 실행에서만 사용할 수 있습니다.",
    SIGN_IN_REQUIRED: "ChatGPT에 먼저 로그인해 주세요.",
    TOKEN_EXPIRED:
      "ChatGPT 연결이 만료되었습니다. 저장된 계정으로 다시 로그인해 주세요.",
    PLAN_PERMISSION_REQUIRED:
      "로그인은 되었지만 구독 사용 동의가 필요합니다. 다시 연결해 주세요.",
    CHATGPT_LIMIT:
      "ChatGPT 사용 한도에 도달했습니다. 사용량 관리에서 확인해 주세요. 유료 API로 전환하지 않았습니다.",
    MODEL_UNAVAILABLE: "사용할 수 있는 모델을 먼저 선택해 주세요.",
    MODELS_UNAVAILABLE:
      "계정의 모델 목록을 가져오지 못했습니다. 구독 권한을 확인하고 다시 연결해 주세요.",
    BUSY: "이미 요청이 진행 중입니다. 완료 또는 중단 후 다시 시도해 주세요.",
    LOCAL_STORAGE: "PC의 암호화된 연결 정보를 읽거나 저장하지 못했습니다.",
  };
  const status = (error as { status?: number })?.status;
  return NextResponse.json(
    {
      error:
        messages[code] ??
        (status === 429
          ? messages.CHATGPT_LIMIT
          : "ChatGPT 요청을 완료하지 못했습니다. 연결·모델·구독 사용 권한을 확인해 주세요. 유료 API로 전환하지 않았습니다."),
    },
    { status: code === "LOCAL_ONLY" ? 403 : 400, headers },
  );
}
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!localEnabled())
    return NextResponse.json(
      { available: false, connected: false },
      { headers },
    );
  try {
    const { id, session } = getLocalSession(request, action === "status");
    const result =
      action === "models"
        ? { models: await listModels(session) }
        : await connectionStatus(session);
    const response = NextResponse.json(result, { headers });
    response.cookies.set(sessionCookie, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 43200,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { id, session } = getLocalSession(request);
    const { action } = await context.params;
    if (session.busy) throw new Error("BUSY");
    session.busy = true;
    try {
      const body = JSON.parse((await readLimitedBody(request)) || "{}");
      if (action === "login") {
        const { account } = z
          .object({ account: z.string().max(200).optional() })
          .parse(body);
        return NextResponse.json(
          { url: await startSignIn(id, account) },
          { headers },
        );
      }
      if (action === "logout")
        return NextResponse.json(
          { revoked: await signOut(session) },
          { headers },
        );
      if (action === "acknowledge") {
        await acknowledge(session);
        return NextResponse.json({ ok: true }, { headers });
      }
      if (action === "model") {
        const { model } = z
          .object({ model: z.string().min(1).max(200) })
          .parse(body);
        await selectModel(session, model);
        return NextResponse.json({ ok: true }, { headers });
      }
      if (action !== "agent" || !session.model)
        throw new Error("MODEL_UNAVAILABLE");
      const { stage, payload } = z
        .object({ stage: stageSchema, payload: z.unknown() })
        .parse(body);
      assertNoBookingReferences(payload);
      const token = await accessToken(session);
      const result = await runAgent(
        "",
        stage,
        payload,
        request.signal,
        createChatGPTSession(token, session.model, request.signal),
      );
      return NextResponse.json(result, { headers });
    } finally {
      session.busy = false;
    }
  } catch (error) {
    return failure(error);
  }
}
