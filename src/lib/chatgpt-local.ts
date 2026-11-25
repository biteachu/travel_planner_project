import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const localOrigin = "http://127.0.0.1:3417";
export const sessionCookie = "travel-chatgpt-session";
const issuer = "https://auth.openai.com";
const resource = "https://api.openai.com/v1";
const tokenEndpoint = `${issuer}/api/accounts/oauth/token`;
const callback = `${localOrigin}/auth/callback`;
const scope =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const folder = join(process.cwd(), ".local-chatgpt");
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  expires_in: z.number().positive(),
  token_type: z.literal("Bearer"),
  scope: z.string().optional(),
});
type Tokens = z.infer<typeof tokenSchema> & { expiresAt: number };
type Account = {
  clientId: string;
  subject: string;
  label: string;
  tokens?: Tokens;
  welcomed?: boolean;
};
type Store = { host: string; accounts: Account[] };
type Session = {
  expires: number;
  account?: string;
  model?: string;
  busy?: boolean;
};
type Pending = {
  state: string;
  nonce: string;
  verifier: string;
  sessionId: string;
  expires: number;
  clientId?: string;
  subject?: string;
};
type State = {
  sessions: Map<string, Session>;
  pending: Map<string, Pending>;
  store?: Store;
  loading?: Promise<Store>;
  saving: Promise<void>;
  refresh: Map<string, Promise<void>>;
};
const globalState = globalThis as typeof globalThis & { travelChatGPT?: State };
const state: State = (globalState.travelChatGPT ??= {
  sessions: new Map(),
  pending: new Map(),
  saving: Promise.resolve(),
  refresh: new Map(),
});
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export function localEnabled() {
  return (
    process.env.TRAVEL_LOCAL_CHATGPT === "1" &&
    !process.env.VERCEL &&
    process.platform === "win32"
  );
}
export function assertLocal(request: NextRequest, isCallback = false) {
  if (!localEnabled() || request.headers.get("host") !== "127.0.0.1:3417")
    throw new Error("LOCAL_ONLY");
  if (
    !isCallback &&
    ((request.headers.get("origin") &&
      request.headers.get("origin") !== localOrigin) ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.method === "POST" &&
        request.headers.get("origin") !== localOrigin))
  )
    throw new Error("LOCAL_ONLY");
}

// Windows DPAPI binds ciphertext to this OS user. No credentials enter argv or logs.
async function protect(value: string, decrypt = false): Promise<string> {
  const command = `Add-Type -AssemblyName System.Security; $value=[Console]::In.ReadToEnd(); $bytes=${decrypt ? "[Convert]::FromBase64String($value)" : "[Text.Encoding]::UTF8.GetBytes($value)"}; $result=[Security.Cryptography.ProtectedData]::${decrypt ? "Unprotect" : "Protect"}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write(${decrypt ? "[Text.Encoding]::UTF8.GetString($result)" : "[Convert]::ToBase64String($result)"})`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("LOCAL_STORAGE"));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("LOCAL_STORAGE"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(output) : reject(new Error("LOCAL_STORAGE"));
    });
    child.stdin.end(value);
  });
}
async function store(): Promise<Store> {
  if (!localEnabled()) throw new Error("LOCAL_ONLY");
  if (state.store) return state.store;
  state.loading ??= (async () => {
    await mkdir(folder, { recursive: true });
    try {
      state.store = JSON.parse(
        await protect(
          await readFile(join(folder, "accounts.dpapi"), "utf8"),
          true,
        ),
      ) as Store;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw new Error("LOCAL_STORAGE");
      state.store = { host: `urn:uuid:${randomUUID()}`, accounts: [] };
      await persist(state.store);
    }
    return state.store!;
  })();
  try {
    return await state.loading;
  } finally {
    state.loading = undefined;
  }
}
async function persist(data: Store) {
  const snapshot = JSON.stringify(data);
  const pending = state.saving
    .catch(() => {})
    .then(async () => {
      const encrypted = await protect(snapshot);
      await writeFile(join(folder, "accounts.tmp"), encrypted);
      await rename(
        join(folder, "accounts.tmp"),
        join(folder, "accounts.dpapi"),
      );
    });
  state.saving = pending;
  await pending;
}
export function getLocalSession(request: NextRequest, create = false) {
  assertLocal(request);
  for (const [id, item] of state.sessions)
    if (item.expires < Date.now()) state.sessions.delete(id);
  let id = request.cookies.get(sessionCookie)?.value ?? "";
  let session = state.sessions.get(id);
  if (!session && create) {
    id = randomBytes(32).toString("base64url");
    session = { expires: Date.now() + 12 * 60 * 60 * 1000 };
    state.sessions.set(id, session);
  }
  if (!session) throw new Error("SIGN_IN_REQUIRED");
  return { id, session };
}
export async function connectionStatus(session: Session) {
  const data = await store();
  const account = data.accounts.find((a) => a.clientId === session.account);
  return {
    available: true,
    connected: !!account?.tokens?.scope
      ?.split(" ")
      .includes("chatgpt.tokens.use.direct"),
    active: account?.clientId,
    model: session.model,
    welcome: !!account?.tokens && !account.welcomed,
    accounts: data.accounts.map((a) => ({
      id: a.clientId,
      label: a.label,
      connected: !!a.tokens,
    })),
  };
}
export async function startSignIn(sessionId: string, clientId?: string) {
  const data = await store();
  const account = clientId
    ? data.accounts.find((a) => a.clientId === clientId)
    : undefined;
  if (clientId && !account) throw new Error("SIGN_IN_REQUIRED");
  for (const [key, pending] of state.pending)
    if (pending.expires < Date.now() || pending.sessionId === sessionId)
      state.pending.delete(key);
  const pending: Pending = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
    expires: Date.now() + 600000,
    sessionId,
    clientId: account?.clientId,
    subject: account?.subject,
  };
  state.pending.set(pending.state, pending);
  const params = new URLSearchParams({
    client_id: account?.clientId ?? "dynamic_agent_client",
    ext_agent_host_id: data.host,
    response_type: "code",
    redirect_uri: callback,
    scope,
    resource,
    state: pending.state,
    nonce: pending.nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256")
      .update(pending.verifier)
      .digest("base64url"),
  });
  if (!account) params.set("agent_name_hint", "여행의 결");
  if (account?.tokens?.id_token)
    params.set("id_token_hint", account.tokens.id_token);
  if (
    account &&
    !account.tokens?.scope?.split(" ").includes("chatgpt.tokens.use.direct")
  )
    params.set("prompt", "consent");
  return `${issuer}/api/accounts/authorize?${params}`;
}
async function exchange(body: URLSearchParams) {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (
      [
        "invalid_grant",
        "invalid_refresh_token",
        "token_expired",
        "refresh_token_expired",
        "refresh_token_invalidated",
        "refresh_token_reused",
      ].includes(error.error)
    )
      throw new Error("TOKEN_EXPIRED");
    throw new Error("AUTH_UNAVAILABLE");
  }
  const tokens = tokenSchema.parse(await response.json());
  return { ...tokens, expiresAt: Date.now() + tokens.expires_in * 1000 };
}
export async function completeSignIn(request: NextRequest) {
  assertLocal(request, true);
  const query = request.nextUrl.searchParams;
  const key = query.get("state") ?? "";
  const pending = state.pending.get(key);
  state.pending.delete(key);
  if (
    !pending ||
    pending.expires < Date.now() ||
    request.cookies.get(sessionCookie)?.value !== pending.sessionId
  )
    throw new Error("AUTH_INVALID");
  const session = state.sessions.get(pending.sessionId);
  if (!session || session.expires < Date.now() || query.has("error"))
    throw new Error("AUTH_INVALID");
  const clientId = query.get("client_id") ?? pending.clientId;
  if (
    !clientId ||
    clientId === "dynamic_agent_client" ||
    (pending.clientId && clientId !== pending.clientId) ||
    !query.get("code")
  )
    throw new Error("AUTH_INVALID");
  const tokens = await exchange(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: query.get("code")!,
      code_verifier: pending.verifier,
      redirect_uri: callback,
      resource,
    }),
  );
  if (!tokens.id_token) throw new Error("AUTH_INVALID");
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  });
  if (
    payload.nonce !== pending.nonce ||
    !payload.sub ||
    (pending.subject && payload.sub !== pending.subject)
  )
    throw new Error("AUTH_INVALID");
  const data = await store();
  const old = data.accounts.find((a) => a.clientId === clientId);
  if (old && old.subject !== payload.sub) throw new Error("AUTH_INVALID");
  const account: Account = {
    clientId,
    subject: payload.sub,
    label: `${typeof payload.email === "string" ? payload.email : "ChatGPT 계정"} · ${clientId.slice(-6)}`,
    tokens,
    welcomed: old?.welcomed,
  };
  data.accounts = [
    ...data.accounts.filter((a) => a.clientId !== clientId),
    account,
  ];
  await persist(data);
  session.account = clientId;
  session.model = undefined;
}
export async function accessToken(session: Session) {
  const data = await store();
  const account = data.accounts.find((a) => a.clientId === session.account);
  if (!account?.tokens) throw new Error("SIGN_IN_REQUIRED");
  if (account.tokens.expiresAt < Date.now() + 60000) {
    let refresh = state.refresh.get(account.clientId);
    if (!refresh) {
      refresh = (async () => {
        if (!account.tokens?.refresh_token) throw new Error("TOKEN_EXPIRED");
        try {
          const tokens = await exchange(
            new URLSearchParams({
              grant_type: "refresh_token",
              client_id: account.clientId,
              refresh_token: account.tokens.refresh_token,
              resource,
            }),
          );
          if (tokens.id_token) {
            const { payload } = await jwtVerify(tokens.id_token, jwks, {
              issuer,
              audience: account.clientId,
              requiredClaims: ["sub", "exp", "iat"],
              clockTolerance: 5,
            });
            if (payload.sub !== account.subject)
              throw new Error("AUTH_INVALID");
          }
          account.tokens = {
            ...account.tokens,
            ...tokens,
            scope: tokens.scope ?? account.tokens.scope,
          };
          await persist(data);
        } catch (e) {
          if (e instanceof Error && e.message === "TOKEN_EXPIRED") {
            account.tokens = undefined;
            await persist(data);
          }
          throw e;
        }
      })();
      state.refresh.set(account.clientId, refresh);
    }
    try {
      await refresh;
    } finally {
      state.refresh.delete(account.clientId);
    }
  }
  if (!account.tokens?.scope?.split(" ").includes("chatgpt.tokens.use.direct"))
    throw new Error("PLAN_PERMISSION_REQUIRED");
  return account.tokens.access_token;
}
export async function listModels(session: Session) {
  const token = await accessToken(session);
  const response = await fetch(`${resource}/models`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("MODELS_UNAVAILABLE");
  const data = z
    .object({
      models: z.array(
        z.object({
          slug: z.string(),
          display_name: z.string(),
          visibility: z.string(),
        }),
      ),
    })
    .parse(await response.json());
  return data.models
    .filter((m) => m.visibility === "list")
    .map((m) => ({ id: m.slug, name: m.display_name }));
}
export async function selectModel(session: Session, model: string) {
  if (!(await listModels(session)).some((m) => m.id === model))
    throw new Error("MODEL_UNAVAILABLE");
  session.model = model;
}
export async function acknowledge(session: Session) {
  const data = await store();
  const account = data.accounts.find((a) => a.clientId === session.account);
  if (account) {
    account.welcomed = true;
    await persist(data);
  }
}
export async function signOut(session: Session) {
  const data = await store();
  const account = data.accounts.find((a) => a.clientId === session.account);
  let revoked = false;
  if (account?.tokens?.refresh_token) {
    try {
      const discovery = await fetch(
        `${issuer}/.well-known/openid-configuration`,
        { signal: AbortSignal.timeout(10000) },
      ).then((r) => r.json());
      const endpoint = new URL(discovery.revocation_endpoint);
      if (endpoint.origin !== issuer) throw new Error("AUTH_INVALID");
      for (let attempt = 0; attempt < 2 && !revoked; attempt++) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: account.tokens.refresh_token,
            token_type_hint: "refresh_token",
            client_id: account.clientId,
          }),
          signal: AbortSignal.timeout(10000),
        });
        revoked = response.status === 200;
        if (!revoked && attempt === 0)
          await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch {
      /* Clear locally; explicitly report unconfirmed remote revocation. */
    }
  }
  if (account) {
    account.tokens = undefined;
    for (const other of state.sessions.values())
      if (other.account === account.clientId) {
        other.account = undefined;
        other.model = undefined;
      }
    await persist(data);
  }
  return revoked;
}
