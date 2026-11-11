import { expect, it } from "vitest";
import { allowedOrigin, CALLBACK_PATH, PRODUCTION_ORIGIN, PUBLICATION_PERMISSIONS, readConfig } from "./config";

// Public dashboard configuration only. This fixture is not a provider credential.
const environment = {
  META_APP_ID: "2056146455756708",
  META_CONFIG_ID: "4569614423283784",
  META_TOKEN_KIND: "system_user",
  META_GRAPH_VERSION: "v26.0",
  META_APP_SECRET: "offline-fixture-not-a-credential",
};

it("accepts the confirmed Meta app ID", () => {
  expect(readConfig(environment)?.appId).toBe("2056146455756708");
});
it("accepts the confirmed Unified Login configuration ID", () => {
  expect(readConfig(environment)?.configId).toBe("4569614423283784");
});
it("selects system-user handling for the confirmed SUAT configuration", () => {
  expect(readConfig(environment)?.tokenKind).toBe("system_user");
});
it("accepts the explicitly selected supported Graph version", () => {
  expect(readConfig(environment)?.version).toBe("v26.0");
});
it("keeps configuration incomplete without the existing app secret", () => {
  expect(readConfig({ ...environment, META_APP_SECRET: undefined })).toBeNull();
});
it("uses the exact callback confirmed in the production dashboard", () => {
  expect(PRODUCTION_ORIGIN + CALLBACK_PATH).toBe("https://flow-fab-editor.lovable.app/api/public/meta/callback");
});
it("keeps only the four confirmed publication permissions", () => {
  expect(PUBLICATION_PERMISSIONS).toEqual([
    "instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement",
  ]);
});

const approvedOrigins = "https://flow-fab-editor.lovable.app,https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com";
it("accepts the exact approved live-preview origin", () => {
  expect(allowedOrigin("https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com", approvedOrigins)).toBe(true);
});
it("preserves the approved production origin with additional origins", () => {
  expect(allowedOrigin("https://flow-fab-editor.lovable.app", approvedOrigins)).toBe(true);
});
it("rejects unrelated origins", () => {
  expect(allowedOrigin("https://unapproved.example.com", approvedOrigins)).toBe(false);
});
it("rejects localhost", () => {
  expect(allowedOrigin("http://localhost:8080", approvedOrigins)).toBe(false);
  expect(allowedOrigin("https://localhost", approvedOrigins)).toBe(false);
});
it("does not approve the excluded static-preview origin", () => {
  expect(allowedOrigin("https://preview--flow-fab-editor.lovable.app", approvedOrigins)).toBe(false);
});
it("rejects lookalike subdomains and insecure variants of the live preview", () => {
  expect(allowedOrigin("https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com.unapproved.example", approvedOrigins)).toBe(false);
  expect(allowedOrigin("http://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com", approvedOrigins)).toBe(false);
});
it("uses the exact live-preview test callback specified by the builder", () => {
  expect("https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com" + CALLBACK_PATH)
    .toBe("https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com/api/public/meta/callback");
});