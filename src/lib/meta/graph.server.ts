import { z } from "zod";
import { PUBLICATION_PERMISSIONS } from "./config";

const errorSchema = z.object({ code: z.number().optional(), is_transient: z.boolean().optional() }).passthrough();
export class GraphError extends Error {
  constructor(public code: string, public recoverable: boolean, public ambiguous: boolean, public retryAfter = 60) {
    super(code);
  }
}
export async function graphRequest(base: string, path: string, token: string, params: Record<string, string> = {}, write = false): Promise<any> {
  const url = new URL(`${base}/${path}`);
  if (!write) url.search = new URLSearchParams(params).toString();
  let response: Response;
  try {
    response = await fetch(url, { method: write ? "POST" : "GET", headers: { Authorization: `Bearer ${token}` },
      body: write ? new URLSearchParams(params) : undefined, signal: AbortSignal.timeout(8000) });
  } catch { throw new GraphError("transport", true, write); }
  const body = await response.json().catch(() => null);
  const error = errorSchema.safeParse(body?.error);
  if (!response.ok || body?.error || !body) {
    const code = error.success ? error.data.code : undefined;
    throw new GraphError(code === 190 ? "reconnect" : `graph_${code ?? response.status}`,
      response.status === 429 || response.status >= 500 || !!(error.success && error.data.is_transient),
      write && (response.status >= 500 || !body), Math.min(3600, Math.max(60, Number(response.headers.get("retry-after")) || 60)));
  }
  return body;
}

export async function inspectToken(base: string, token: string, appId: string, secret: string) {
  const result = await graphRequest(base, "debug_token", `${appId}|${secret}`, { input_token: token });
  const schema = z.object({ is_valid: z.literal(true), app_id: z.string(), user_id: z.string(),
    expires_at: z.number(), data_access_expires_at: z.number().optional(), scopes: z.array(z.string()),
    granular_scopes: z.array(z.object({ scope: z.string(), target_ids: z.array(z.string()).optional() })).optional() });
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) throw new GraphError("reconnect", false, false);
  const data = parsed.data;
  if (data.app_id !== appId || (data.expires_at && data.expires_at * 1000 <= Date.now()) ||
    (data.data_access_expires_at && data.data_access_expires_at * 1000 <= Date.now()) ||
    !PUBLICATION_PERMISSIONS.every((s) => data.scopes.includes(s))) throw new GraphError("reconnect", false, false);
  return data;
}

export async function discoverAccounts(base: string, token: string, kind: "user" | "system_user", debug: Awaited<ReturnType<typeof inspectToken>>) {
  const pageSchema = z.object({ id: z.string(), name: z.string().optional(), access_token: z.string().optional(),
    instagram_business_account: z.object({ id: z.string(), username: z.string().optional(), profile_picture_url: z.string().optional() }).optional() });
  const fields = kind === "system_user" ? "id,name,instagram_business_account{id,username,profile_picture_url}" : "id,name,access_token,instagram_business_account{id,username,profile_picture_url}";
  if (kind === "system_user") {
    // SUAT assets are explicitly delegated; do not assume /me/accounts has Facebook User semantics.
    const ids = [...new Set((debug.granular_scopes ?? []).filter((s) => s.scope === "pages_show_list" || s.scope === "pages_read_engagement").flatMap((s) => s.target_ids ?? []))];
    if (!ids.length || ids.length > 50) throw new GraphError("asset_configuration_incomplete", false, false);
    const pages = [];
    for (const id of ids) pages.push(pageSchema.parse(await graphRequest(base, id, token, { fields })));
    return pages;
  }
  const pages = [];
  let after: string | undefined;
  for (let i = 0; i < 10; i++) {
    const response = await graphRequest(base, "me/accounts", token, { fields, limit: "50", ...(after ? { after } : {}) });
    pages.push(...z.array(pageSchema).parse(response.data));
    if (!response.paging?.next) return pages;
    after = z.string().parse(response.paging?.cursors?.after);
  }
  throw new GraphError("too_many_assets", false, false);
}