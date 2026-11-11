import { createServerFn } from "@tanstack/react-start";

export const GRAPH = "https://graph.facebook.com/v21.0";
export const META_SCOPES = [
  "instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management",
].join(",");

/** Retorna dados públicos para montar o link de login da Meta. */
export const getMetaConfig = createServerFn({ method: "GET" }).handler(async () => {
  const appId = process.env["META_APP_ID"] ?? "";
  return { appId, configured: Boolean(appId && process.env["META_APP_SECRET"]) };
});
