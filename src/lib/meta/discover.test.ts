import { describe, it, expect } from "vitest";
import { grantedInstagramIds } from "./graph.server";
describe("grantedInstagramIds", () => {
  it("lists Instagram accounts granted directly, without duplicates", () => {
    expect(grantedInstagramIds({ granular_scopes: [
      { scope: "instagram_basic", target_ids: ["17841"] },
      { scope: "instagram_content_publish", target_ids: ["17841", "17842"] },
      { scope: "pages_show_list", target_ids: ["999"] },
    ] })).toEqual(["17841", "17842"]);
  });
  it("returns nothing when no Instagram asset was granted", () => {
    expect(grantedInstagramIds({})).toEqual([]);
  });
});
