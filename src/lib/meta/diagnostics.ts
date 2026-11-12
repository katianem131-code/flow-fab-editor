import { z } from "zod";

/**
 * Sanitized, server-only diagnostics for the Meta OAuth callback.
 * Only fixed enums and integer counts can ever be emitted: no tokens, codes, state,
 * cookies, asset/user/business IDs, usernames, URLs, headers, raw payloads or Graph messages.
 */
export const TOKEN_TYPES = ["USER", "SYSTEM_USER", "PAGE", "UNKNOWN", "MISSING"] as const;
export const BRANCHES = ["none", "user_me_accounts", "system_user_target_ids"] as const;
export const STAGES = ["state", "code", "config", "token_exchange", "token_type", "long_lived_exchange",
  "inspect", "discover", "store", "done"] as const;
export const REASONS = ["ok", "expired_state", "cancelled", "not_configured", "asset_configuration_incomplete",
  "reconnect", "too_many_assets", "limit", "graph_error", "transport", "storage", "unexpected"] as const;
export const SCOPE_ALLOWLIST = ["instagram_basic", "instagram_content_publish", "pages_show_list",
  "pages_read_engagement", "business_management", "instagram_manage_comments", "instagram_manage_insights",
  "pages_manage_posts", "pages_manage_metadata", "public_profile", "email"] as const;

type Scope = (typeof SCOPE_ALLOWLIST)[number];
const count = z.number().int().min(0).max(100000);
const eventSchema = z.object({
  event: z.literal("meta_callback_diag"),
  diag_id: z.string().uuid(),
  stage: z.enum(STAGES),
  reason: z.enum(REASONS),
  token_type: z.enum(TOKEN_TYPES),
  branch: z.enum(BRANCHES),
  scopes: z.array(z.object({ scope: z.enum(SCOPE_ALLOWLIST), target_ids: count, has_target_ids: z.boolean() })),
  other_scope_count: count,
  pages_found: count,
  pages_with_instagram: count,
  direct_instagram_target_ids: count,
  direct_instagram_added: count,
  accounts_stored: count,
  accounts_skipped_limit: count,
}).strict();
export type DiagEvent = z.infer<typeof eventSchema>;

export function mapTokenType(raw: unknown): (typeof TOKEN_TYPES)[number] {
  if (raw === undefined || raw === null || raw === "") return "MISSING";
  if (raw === "USER" || raw === "SYSTEM_USER" || raw === "PAGE") return raw;
  return "UNKNOWN";
}

export function summarizeScopes(granular: unknown) {
  const list = Array.isArray(granular) ? granular : [];
  const scopes: DiagEvent["scopes"] = [];
  let other = 0;
  for (const g of list) {
    const name = g && typeof g === "object" ? (g as { scope?: unknown }).scope : undefined;
    const ids = g && typeof g === "object" ? (g as { target_ids?: unknown }).target_ids : undefined;
    if (typeof name === "string" && (SCOPE_ALLOWLIST as readonly string[]).includes(name)) {
      scopes.push({ scope: name as Scope, target_ids: Array.isArray(ids) ? Math.min(ids.length, 100000) : 0, has_target_ids: Array.isArray(ids) });
    } else other++;
  }
  return { scopes, other_scope_count: other };
}

export function reasonFromError(code: string): (typeof REASONS)[number] {
  if (code === "asset_configuration_incomplete" || code === "reconnect" || code === "too_many_assets" || code === "transport") return code;
  if (code === "account_storage" || code === "token_storage") return "storage";
  if (/^graph_\d+$/.test(code)) return "graph_error";
  return "unexpected";
}

export function createDiag() {
  const e: DiagEvent = { event: "meta_callback_diag", diag_id: crypto.randomUUID(), stage: "state", reason: "unexpected",
    token_type: "MISSING", branch: "none", scopes: [], other_scope_count: 0, pages_found: 0, pages_with_instagram: 0,
    direct_instagram_target_ids: 0, direct_instagram_added: 0, accounts_stored: 0, accounts_skipped_limit: 0 };
  return {
    event: e,
    stage(s: DiagEvent["stage"]) { e.stage = s; },
    set(patch: Partial<Omit<DiagEvent, "event" | "diag_id">>) { Object.assign(e, patch); },
    /** Serializes only schema-validated fields; on any violation emits a minimal fixed record. */
    serialize(): string {
      const parsed = eventSchema.safeParse(e);
      return JSON.stringify(parsed.success ? parsed.data : { event: "meta_callback_diag", diag_id: e.diag_id, reason: "unexpected", invalid: true });
    },
    emit(reason: DiagEvent["reason"]) { e.reason = reason; console.info(this.serialize()); },
  };
}
export type Diag = ReturnType<typeof createDiag>;
