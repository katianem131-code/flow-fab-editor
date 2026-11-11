import { describe, expect, it } from "vitest";
import { matchProduct, parsePayment } from "./webhook";

describe("payment webhook", () => {
  it("reads a Kiwify approved order", () => {
    const p = parsePayment({ order_id: "k1", order_status: "paid", Customer: { email: "A@B.com" }, Product: { product_name: "LabRemix Pro" } });
    expect(p).toEqual({ email: "a@b.com", event: "approved", productName: "LabRemix Pro", externalId: "k1" });
  });
  it("reads a Hotmart refund", () => {
    const p = parsePayment({ event: "PURCHASE_REFUNDED", data: { buyer: { email: "x@y.com" }, product: { name: "Básico" }, purchase: { transaction: "HP1" } } });
    expect(p.event).toBe("refunded");
  });
  it("credit pack wins over plan name", () => {
    expect(matchProduct("Pacote 200 créditos Pro").pack?.credits).toBe(200);
    expect(matchProduct("LabRemix Pro").plan?.monthlyCredits).toBe(300);
  });
});
