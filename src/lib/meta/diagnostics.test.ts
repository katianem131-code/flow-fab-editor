import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiag, mapTokenType, summarizeScopes } from "./diagnostics";

const S = {
  token: "SENTINEL_TOKEN_x9", long: "SENTINEL_LONGTOKEN_x9", code: "SENTINEL_AUTHCODE_x9", cookie: "SENTINELCOOKIEx9",
  secret: "SENTINEL_SECRET_x9", user: "SENTINEL_USERID_x9", dbUser: "SENTINEL_DBUSER_x9", page: "SENTINEL_PAGEID_x9",
  ig: "SENTINEL_IGID_x9", username: "SENTINEL_USERNAME_x9", graphMsg: "SENTINEL_GRAPHMSG_x9", rawType: "SENTINEL_RAWTYPE_x9",
  scope: "SENTINEL_SCOPE_x9", business: "SENTINEL_BUSINESS_x9", acc: "SENTINEL_ACCROW_x9",
};
const STATE = "4b0f6a7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const ORIGIN = "https://flow-fab-editor.lovable.app";
const PERMS = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"];

let rpcRows: unknown[] = [];
vi.mock("@/integrations/supabase/client.server", () => {
  const chain = (result: unknown): any => new Proxy({}, { get: (_t, p) => p === "then"
    ? (r: (v: unknown) => void) => r(result) : () => chain(result) });
  return { supabaseAdmin: {
    rpc: async () => ({ data: rpcRows, error: null }),
    from: (table: string) => ({
      select: () => chain(table === "instagram_accounts" ? { data: [] } : { data: null }),
      upsert: () => chain(table === "instagram_accounts" ? { data: { id: S.acc }, error: null } : { error: null }),
    }),
  } };
});

type Scenario = { type?: unknown; granular?: unknown[]; meAccounts?: unknown[]; nodes?: Record<string, unknown>; exchangeError?: boolean };
function graphFetch(sc: Scenario) {
  return vi.fn(async (input: string | URL) => {
    const u = new URL(String(input)); const path = u.pathname.replace(/^\/v\d+\.0\//, "");
    if (path === "oauth/access_token") {
      if (sc.exchangeError) return Response.json({ error: { message: S.graphMsg, code: 100, fbtrace_id: S.business } }, { status: 400 });
      return Response.json({ access_token: u.searchParams.get("grant_type") ? S.long : S.token });
    }
    if (path === "debug_token") return Response.json({ data: { is_valid: true, app_id: "123", user_id: S.user, type: sc.type,
      expires_at: 0, scopes: [...PERMS, S.scope], granular_scopes: sc.granular ?? [] } });
    if (path === "me/accounts") return Response.json({ data: sc.meAccounts ?? [] });
    const node = sc.nodes?.[path];
    return node ? Response.json(node) : Response.json({ error: { message: S.graphMsg, code: 803 } }, { status: 404 });
  });
}

let logs: string[] = [];
async function run(sc: Scenario, opts: { cookie?: boolean; error?: boolean } = {}) {
  vi.stubGlobal("fetch", graphFetch(sc));
  const { Route } = await import("@/routes/api/public/meta/callback");
  const q = new URLSearchParams({ state: STATE, code: S.code, ...(opts.error ? { error: "access_denied" } : {}) });
  const request = new Request(`${ORIGIN}/api/public/meta/callback?${q}`, { headers: opts.cookie === false ? {} : { cookie: `meta_binding_${STATE}=${S.cookie}` } });
  const res: Response = await (Route.options as any).server.handlers.GET({ request });
  const events = logs.filter((l) => l.includes("meta_callback_diag")).map((l) => JSON.parse(l));
  return { location: res.headers.get("location") ?? "", events, all: logs.join("\n") };
}
function expectRedacted(all: string) {
  for (const v of [...Object.values(S), STATE, "access_denied", ORIGIN]) expect(all).not.toContain(v);
  expect(all).not.toMatch(/https?:\/\//);
}

beforeEach(() => {
  logs = []; rpcRows = [{ user_id: S.dbUser, redirect_uri: `${ORIGIN}/api/public/meta/callback` }];
  Object.assign(process.env, { META_APP_ID: "123", META_CONFIG_ID: "456", META_GRAPH_VERSION: "v26.0", META_TOKEN_KIND: "system_user", META_APP_SECRET: S.secret, META_ALLOWED_ORIGINS: "" });
  for (const m of ["log", "info", "warn", "error", "debug"] as const)
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(" ")); });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("diagnostic helpers", () => {
  it("maps raw token types only to the fixed enum", () => {
    expect(mapTokenType("USER")).toBe("USER"); expect(mapTokenType("SYSTEM_USER")).toBe("SYSTEM_USER");
    expect(mapTokenType("PAGE")).toBe("PAGE"); expect(mapTokenType(undefined)).toBe("MISSING"); expect(mapTokenType("")).toBe("MISSING");
    expect(mapTokenType("system_user")).toBe("UNKNOWN"); expect(mapTokenType(S.rawType)).toBe("UNKNOWN"); expect(mapTokenType({ x: 1 })).toBe("UNKNOWN");
  });
  it("keeps allowlisted scope names and only counts target IDs", () => {
    const r = summarizeScopes([{ scope: "instagram_basic", target_ids: [S.ig, S.page] }, { scope: "pages_show_list" }, { scope: S.scope, target_ids: [S.ig] }]);
    expect(r).toEqual({ scopes: [{ scope: "instagram_basic", target_ids: 2, has_target_ids: true }, { scope: "pages_show_list", target_ids: 0, has_target_ids: false }], other_scope_count: 1 });
    expectRedacted(JSON.stringify(r));
  });
  it("refuses to serialize injected fields and emits a minimal record instead", () => {
    const d = createDiag(); (d.event as any).leak = S.token;
    const out = d.serialize(); expect(out).not.toContain(S.token); expect(JSON.parse(out).invalid).toBe(true);
  });
  it("uses a fresh random correlation id per attempt", () => {
    expect(createDiag().event.diag_id).not.toBe(createDiag().event.diag_id);
  });
});

describe("callback instrumentation", () => {
  it("SYSTEM_USER with no target_ids: records branch, zero counts and keeps sem-conta-profissional", async () => {
    const r = await run({ type: "SYSTEM_USER", granular: PERMS.map((scope) => ({ scope })) });
    expect(r.location).toContain("meta=sem-conta-profissional");
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ stage: "discover", reason: "asset_configuration_incomplete", token_type: "SYSTEM_USER",
      branch: "system_user_target_ids", pages_found: 0, pages_with_instagram: 0, direct_instagram_target_ids: 0 });
    expect(r.events[0].scopes).toContainEqual({ scope: "instagram_basic", target_ids: 0, has_target_ids: false });
    expectRedacted(r.all);
  });
  it("USER via me/accounts with a Page lacking Instagram: counts pages and pages with Instagram", async () => {
    const r = await run({ type: "USER", meAccounts: [{ id: S.page, name: S.business, access_token: S.token }] });
    expect(r.location).toContain("meta=sem-conta-profissional");
    expect(r.events[0]).toMatchObject({ token_type: "USER", branch: "user_me_accounts", pages_found: 1, pages_with_instagram: 0, reason: "asset_configuration_incomplete" });
    expectRedacted(r.all);
  });
  it("unknown and missing raw types are enum-mapped and fall back to the configured branch", async () => {
    const a = await run({ type: S.rawType });
    expect(a.events[0]).toMatchObject({ token_type: "UNKNOWN", branch: "system_user_target_ids" }); expectRedacted(a.all);
    logs = [];
    const b = await run({});
    expect(b.events[0]).toMatchObject({ token_type: "MISSING", branch: "system_user_target_ids" }); expectRedacted(b.all);
  });
  it("direct Instagram target_ids: success result preserved and only counts logged", async () => {
    const r = await run({ type: "SYSTEM_USER", granular: [{ scope: "instagram_basic", target_ids: [S.ig] }, { scope: "instagram_content_publish", target_ids: [S.ig] }],
      nodes: { [S.ig]: { id: S.ig, username: S.username, profile_picture_url: `https://cdn.example/${S.username}.jpg` } } });
    expect(r.location).toContain("meta=conectado-1");
    expect(r.events[0]).toMatchObject({ stage: "done", reason: "ok", direct_instagram_target_ids: 1, direct_instagram_added: 1, accounts_stored: 1 });
    expectRedacted(r.all);
  });
  it("Graph error on token exchange: fixed reason, no Graph message, result stays erro", async () => {
    const r = await run({ exchangeError: true });
    expect(r.location).toContain("meta=erro");
    expect(r.events[0]).toMatchObject({ stage: "token_exchange", reason: "graph_error", token_type: "MISSING", branch: "none" });
    expectRedacted(r.all);
  });
  it("missing binding cookie and consumed state emit expired_state without contacting Meta", async () => {
    const a = await run({}, { cookie: false });
    expect(a.location).toContain("meta=expirado"); expect(a.events[0]).toMatchObject({ stage: "state", reason: "expired_state" });
    logs = []; rpcRows = [];
    const b = await run({});
    expect(b.location).toContain("meta=expirado"); expect(b.events[0]).toMatchObject({ reason: "expired_state" });
    expectRedacted(a.all + b.all);
  });
  it("cancelled authorization keeps cancelado", async () => {
    const r = await run({}, { error: true });
    expect(r.location).toContain("meta=cancelado"); expect(r.events[0]).toMatchObject({ stage: "code", reason: "cancelled" });
    expectRedacted(r.all);
  });
});
