import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";
async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
beforeAll(async () => {
  // Simulate Supabase auth identities; this does not test hosted Auth or SMTP.
  await db.exec(`create role authenticated; create role anon;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.query("insert into auth.users values ($1), ($2)", [ownerA, ownerB]);
  const schema = await readFile(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  await db.exec(schema);
  await db.exec(schema); // Setup is safe to run again.
}, 20000);
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("reset role; truncate public.trips cascade;");
});
async function seedOwners() {
  for (const owner of [ownerA, ownerB]) {
    await asUser(owner);
    await db.query(
      "insert into public.trips(id, owner_id, title, data) values ('same-id', $1, 'trip', '{}')",
      [owner],
    );
  }
}

it("변경 저장만 버전을 남기고 두 사용자의 동일 여행 ID를 분리한다", async () => {
  await asUser(ownerA);
  await db.query(
    "insert into public.trips(id, owner_id, title, data) values ('same-id', $1, 'first', '{\"version\":1}')",
    [ownerA],
  );
  await db.exec(
    "update public.trips set updated_at = now() where id = 'same-id'",
  );
  expect(
    (
      await db.query<{ count: number }>(
        "select count(*)::int from public.trip_revisions",
      )
    ).rows[0].count,
  ).toBe(1);
  await db.exec(
    "update public.trips set data = '{\"version\":2}' where id = 'same-id'",
  );
  expect(
    (
      await db.query<{ count: number }>(
        "select count(*)::int from public.trip_revisions",
      )
    ).rows[0].count,
  ).toBe(2);
  await asUser(ownerB);
  expect((await db.query("select * from public.trips")).rows).toHaveLength(0);
  expect(
    (await db.query("select * from public.trip_revisions")).rows,
  ).toHaveLength(0);
  await db.query(
    "insert into public.trips(id, owner_id, title, data) values ('same-id', $1, 'second user', '{}')",
    [ownerB],
  );
  expect((await db.query("select * from public.trips")).rows).toHaveLength(1);
});

it("타인의 행 변경과 버전 위조를 거절한다", async () => {
  await seedOwners();
  await asUser(ownerB);
  await expect(
    db.query(
      "insert into public.trips(id, owner_id, title, data) values ('forged', $1, 'forged', '{}')",
      [ownerA],
    ),
  ).rejects.toThrow();
  expect(
    (
      await db.query(
        "update public.trips set title = 'forged' where owner_id = $1 returning id",
        [ownerA],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into public.trip_revisions(trip_id, owner_id, title, data) values ('same-id', $1, 'forged', '{}')",
      [ownerB],
    ),
  ).rejects.toThrow();
  await expect(
    db.exec("update public.trip_revisions set data = '{}' "),
  ).rejects.toThrow();
});

it("본인의 여행 삭제만 버전을 함께 지우며 비로그인 접근은 차단한다", async () => {
  await seedOwners();
  await asUser(ownerB);
  expect(
    (
      await db.query(
        "delete from public.trips where owner_id = $1 returning id",
        [ownerA],
      )
    ).rows,
  ).toHaveLength(0);
  await asUser(ownerA);
  await db.exec("delete from public.trips where id = 'same-id'");
  expect(
    (await db.query("select * from public.trip_revisions")).rows,
  ).toHaveLength(0);
  await asUser(ownerB);
  expect(
    (await db.query("select * from public.trip_revisions")).rows,
  ).toHaveLength(1);
  await db.exec("reset role; set role anon");
  await expect(db.exec("select * from public.trips")).rejects.toThrow();
});
