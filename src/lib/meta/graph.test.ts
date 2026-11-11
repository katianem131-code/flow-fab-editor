import { afterEach, expect, it, vi } from "vitest";
import { discoverAccounts, graphRequest } from "./graph.server";
afterEach(() => vi.unstubAllGlobals());
it("SUAT discovery uses delegated IDs instead of /me/accounts", async () => {
  const fetcher = vi.fn(async () => Response.json({ id: "page", instagram_business_account: { id: "ig" } })); vi.stubGlobal("fetch", fetcher);
  const pages = await discoverAccounts("https://graph.facebook.com/v26.0", "offline-token", "system_user", { is_valid: true, app_id: "app", user_id: "system", expires_at: 0, scopes: [], granular_scopes: [{ scope: "pages_show_list", target_ids: ["page"] }] });
  expect(pages[0].instagram_business_account?.id).toBe("ig"); expect(String(fetcher.mock.calls[0]?.[0])).toContain("/page?");
});
it("transport failure on a write is classified as ambiguous", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  await expect(graphRequest("https://graph.facebook.com/v26.0", "ig/media_publish", "offline-token", {}, true)).rejects.toMatchObject({ ambiguous: true, recoverable: true });
});