import { z } from "zod";

export const CALLBACK_PATH = "/api/public/meta/callback";
export const PRODUCTION_ORIGIN = "https://flow-fab-editor.lovable.app";
export const PUBLICATION_PERMISSIONS = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"];
export const configSchema = z.object({
  appId: z.string().regex(/^\d+$/),
  configId: z.string().regex(/^\d+$/),
  version: z.string().regex(/^v\d+\.0$/),
  tokenKind: z.enum(["user", "system_user"]),
  appSecret: z.string().min(1),
});

export function readConfig(env: Record<string, string | undefined>) {
  const result = configSchema.safeParse({ appId: env.META_APP_ID, configId: env.META_CONFIG_ID,
    version: env.META_GRAPH_VERSION, tokenKind: env.META_TOKEN_KIND, appSecret: env.META_APP_SECRET });
  return result.success ? result.data : null;
}

export function allowedOrigin(origin: string, extras = "") {
  const allowed = [PRODUCTION_ORIGIN, ...extras.split(",").map((v) => v.trim()).filter(Boolean)];
  return allowed.includes(origin) && new URL(origin).protocol === "https:";
}

export function authorizationUrl(config: NonNullable<ReturnType<typeof readConfig>>, origin: string, state: string) {
  const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
  url.search = new URLSearchParams({ client_id: config.appId, config_id: config.configId,
    response_type: "code", override_default_response_type: "true",
    redirect_uri: origin + CALLBACK_PATH, state }).toString();
  // The dashboard configuration owns the minimal permissions and Unified Login surface; no scope override.
  return url.toString();
}

export async function bindingHash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function bindingCookie(headers: Headers, state: string) {
  return (headers.get("cookie") ?? "").split(";").map((s) => s.trim())
    .find((s) => s.startsWith(`meta_binding_${state}=`))?.split("=")[1] ?? "";
}