import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
const key = "a".repeat(64);
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const acquire = async (id = first) =>
  (
    await db.query<{ allowed: boolean }>(
      "select public.acquire_agent_permit($1, $2) as allowed",
      [key, id],
    )
  ).rows[0].allowed;
const release = async (id = first) =>
  db.query("select public.release_agent_permit($1, $2)", [key, id]);
beforeAll(async () => {
  await db.exec(
    "create role anon; create role authenticated; create role service_role;",
  );
  const sql = await readFile(
    new URL("../supabase/rate-limit.sql", import.meta.url),
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
}, 20000);
beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.agent_limits; set role service_role;",
  );
});
afterAll(async () => {
  await db.close();
});
it("같은 키의 실행을 하나만 허용하고 잘못된 토큰은 해제하지 않는다", async () => {
  expect(await acquire()).toBe(true);
  expect(await acquire(second)).toBe(false);
  await release(second);
  expect(await acquire(second)).toBe(false);
  await release();
  expect(await acquire(second)).toBe(true);
});
it("분당 한도를 유지하고 만료된 실행 토큰은 새 실행을 해제하지 못한다", async () => {
  for (let i = 0; i < 15; i++) {
    expect(await acquire()).toBe(true);
    await release();
  }
  expect(await acquire()).toBe(false);
  await db.exec(
    "reset role; update public.agent_limits set window_start = now() - interval '61 seconds'; set role service_role;",
  );
  expect(await acquire()).toBe(true);
  await db.exec(
    "reset role; update public.agent_limits set lease_until = now() - interval '1 second'; set role service_role;",
  );
  expect(await acquire(second)).toBe(true);
  await release();
  expect(await acquire()).toBe(false);
});
it("일반 사용자에게 제한 테이블과 함수 접근을 허용하지 않는다", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role; set role ${role};`);
    await expect(acquire()).rejects.toThrow();
    await expect(release()).rejects.toThrow();
    await expect(
      db.query("select * from public.agent_limits"),
    ).rejects.toThrow();
  }
});
