import { expect, it } from "vitest";
import { CALLBACK_PATH, PRODUCTION_ORIGIN, PUBLICATION_PERMISSIONS, readConfig } from "./config";

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