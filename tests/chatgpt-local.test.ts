import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertLocal,
  completeSignIn,
  getLocalSession,
} from "../src/lib/chatgpt-local";
afterEach(() => vi.unstubAllEnvs());
function request(origin = "http://127.0.0.1:3417", host = "127.0.0.1:3417") {
  return new NextRequest("http://127.0.0.1:3417/api/chatgpt/login", {
    method: "POST",
    headers: { origin, host },
  });
}
it("로컬 기능을 명시적으로 켜지 않거나 공개 배포이면 차단한다", () => {
  vi.stubEnv("TRAVEL_LOCAL_CHATGPT", "");
  expect(() => assertLocal(request())).toThrow("LOCAL_ONLY");
  vi.stubEnv("TRAVEL_LOCAL_CHATGPT", "1");
  vi.stubEnv("VERCEL", "1");
  expect(() => assertLocal(request())).toThrow("LOCAL_ONLY");
});
it("다른 사이트 요청과 DNS rebinding Host를 거부한다", () => {
  vi.stubEnv("TRAVEL_LOCAL_CHATGPT", "1");
  vi.stubEnv("VERCEL", "");
  expect(() => assertLocal(request("https://evil.example"))).toThrow(
    "LOCAL_ONLY",
  );
  expect(() =>
    assertLocal(request("http://127.0.0.1:3417", "evil.example:3417")),
  ).toThrow("LOCAL_ONLY");
});
it("세션 없는 생성과 등록되지 않은 callback을 거부한다", async () => {
  vi.stubEnv("TRAVEL_LOCAL_CHATGPT", "1");
  vi.stubEnv("VERCEL", "");
  expect(() => getLocalSession(request())).toThrow();
  await expect(
    completeSignIn(
      new NextRequest(
        "http://127.0.0.1:3417/auth/callback?code=fake&state=unknown",
        { headers: { host: "127.0.0.1:3417" } },
      ),
    ),
  ).rejects.toThrow();
});
