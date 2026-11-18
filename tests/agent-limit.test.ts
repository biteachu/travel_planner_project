import { afterEach, expect, it, vi } from "vitest";
import { acquireAgentPermit, LimiterUnavailable } from "../src/lib/agent-limit";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function databaseMode() {
  vi.stubEnv("AGENT_LIMITER_MODE", "database");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-only-secret");
}
it("앞뒤 공백이 달라도 같은 키의 실행 허가를 공유한다", async () => {
  vi.stubEnv("AGENT_LIMITER_MODE", "process");
  vi.stubEnv("VERCEL", "");
  const release = await acquireAgentPermit("test-normalized-key");
  expect(release).not.toBeNull();
  expect(await acquireAgentPermit("  test-normalized-key\t")).toBeNull();
  await release!();
});
it("DB에는 사용자 키 대신 지문과 실행별 토큰만 전송한다", async () => {
  databaseMode();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("true"))
    .mockResolvedValueOnce(new Response("null"));
  vi.stubGlobal("fetch", fetcher);
  const release = await acquireAgentPermit("test-user-private-key");
  expect(release).not.toBeNull();
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.p_key_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(fetcher.mock.calls)).not.toContain(
    "test-user-private-key",
  );
  await release!();
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(body);
});
it("DB 거절과 연결 실패를 구분하며 제한을 우회하지 않는다", async () => {
  databaseMode();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("false"))
      .mockRejectedValueOnce(new Error("server secret")),
  );
  expect(await acquireAgentPermit("test-limit-key")).toBeNull();
  await expect(acquireAgentPermit("test-limit-key")).rejects.toBeInstanceOf(
    LimiterUnavailable,
  );
});
it("Vercel에서는 프로세스 모드로 제한을 우회하지 않는다", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("AGENT_LIMITER_MODE", "process");
  await expect(acquireAgentPermit("test-hosted-key")).rejects.toBeInstanceOf(
    LimiterUnavailable,
  );
});
it("허가 해제 실패는 완성 결과를 실패로 바꾸지 않는다", async () => {
  databaseMode();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("true"))
      .mockRejectedValueOnce(new Error("offline")),
  );
  const release = await acquireAgentPermit("test-release-key");
  await expect(release!()).resolves.toBeUndefined();
});
