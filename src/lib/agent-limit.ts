import { createHash, randomUUID } from "node:crypto";
export class LimiterUnavailable extends Error {}
const windows = new Map<
  string,
  { count: number; start: number; active: boolean }
>();

export async function acquireAgentPermit(
  key: string,
): Promise<(() => Promise<void>) | null> {
  const hash = createHash("sha256").update(key.trim()).digest("hex");
  const hosted = process.env.VERCEL === "1";
  const mode =
    process.env.AGENT_LIMITER_MODE || (hosted ? "database" : "process");
  if (mode === "database") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const credential = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !credential) throw new LimiterUnavailable();
    let url: URL;
    try {
      url = new URL(base);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error();
    } catch {
      throw new LimiterUnavailable();
    }
    const lease = randomUUID();
    const rpc = async (name: string) => {
      try {
        const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            apikey: credential,
            Authorization: `Bearer ${credential}`,
          },
          body: JSON.stringify({ p_key_hash: hash, p_lease_id: lease }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error();
        return await response.json();
      } catch {
        throw new LimiterUnavailable();
      }
    };
    const permitted = await rpc("acquire_agent_permit");
    if (permitted === false) return null;
    if (permitted !== true) throw new LimiterUnavailable();
    return async () => {
      // A failed release must not discard a completed model result. The lease expires.
      try {
        await rpc("release_agent_permit");
      } catch {
        /* no credentials in logs */
      }
    };
  }
  if (mode !== "process" || hosted) throw new LimiterUnavailable();
  const now = Date.now();
  for (const [id, slot] of windows)
    if (now - slot.start >= 60000 && !slot.active) windows.delete(id);
  let slot = windows.get(hash);
  if (!slot) {
    slot = { count: 0, start: now, active: false };
    windows.set(hash, slot);
  }
  if (slot.active || slot.count >= 15) return null;
  slot.count++;
  slot.active = true;
  return async () => {
    slot.active = false;
  };
}
