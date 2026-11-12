import { expect, it } from "vitest";
import { startErrorMessage, verifyRequestOrigin } from "./config";

const PREVIEW = "https://55a1bc31-911b-44fc-80b5-6685f61b9567.lovableproject.com";
const ALLOW = `https://flow-fab-editor.lovable.app,${PREVIEW}`;
const h = (o: Record<string, string>) => new Headers(o);

it("accepts a matching allowed Origin", () => {
  expect(verifyRequestOrigin(h({ origin: PREVIEW }), PREVIEW, ALLOW)).toBe(true);
});
it("rejects an Origin that differs from the claimed origin", () => {
  expect(verifyRequestOrigin(h({ origin: "https://flow-fab-editor.lovable.app" }), PREVIEW, ALLOW)).toBe(false);
});
it("accepts a valid same-origin Referer when Origin is absent", () => {
  expect(verifyRequestOrigin(h({ referer: `${PREVIEW}/agenda?x=1` }), PREVIEW, ALLOW)).toBe(true);
});
it("rejects when both Origin and Referer are absent", () => {
  expect(verifyRequestOrigin(h({}), PREVIEW, ALLOW)).toBe(false);
});
it("rejects an external Referer", () => {
  expect(verifyRequestOrigin(h({ referer: "https://evil.example/agenda" }), PREVIEW, ALLOW)).toBe(false);
});
it("rejects a malformed Referer", () => {
  expect(verifyRequestOrigin(h({ referer: "not a url" }), PREVIEW, ALLOW)).toBe(false);
});
it("rejects Origin null even with a valid Referer", () => {
  expect(verifyRequestOrigin(h({ origin: "null", referer: `${PREVIEW}/agenda` }), PREVIEW, ALLOW)).toBe(false);
});
it("rejects an external Origin even with a valid Referer", () => {
  expect(verifyRequestOrigin(h({ origin: "https://evil.example", referer: `${PREVIEW}/agenda` }), PREVIEW, ALLOW)).toBe(false);
});
it("rejects a claimed origin outside the allowlist even if headers match", () => {
  expect(verifyRequestOrigin(h({ origin: "https://evil.example" }), "https://evil.example", ALLOW)).toBe(false);
});
it("rejects an Origin with a path instead of a bare origin", () => {
  expect(verifyRequestOrigin(h({ origin: `${PREVIEW}/agenda` }), PREVIEW, ALLOW)).toBe(false);
});
it("maps the origin code to a specific message and hides unknown errors", () => {
  expect(startErrorMessage(new Error("origem_invalida"))).toContain("não está autorizado");
  expect(startErrorMessage(new Error("internal db detail"))).not.toContain("internal");
});
