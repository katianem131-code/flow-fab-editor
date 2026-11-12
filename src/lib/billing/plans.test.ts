import { describe, expect, it } from "vitest";
import { accountLimit, PLANS } from "./plans";
import { parsePayment } from "./webhook";

describe("planos", () => {
  it("preços", () => expect(PLANS.map((p) => p.price)).toEqual(["R$ 79/mês", "R$ 99/mês", "R$ 149/mês"]));
  it("Básico permite 3 contas", () => expect(accountLimit("Básico", "ativo")).toBe(3));
  it("Pro permite 7 contas", () => expect(accountLimit("Pro", "ativo")).toBe(7));
  it("Agência permite 15 contas", () => expect(accountLimit("Agência", "ativo")).toBe(15));
  it("plano cancelado volta ao limite gratuito", () => expect(accountLimit("Agência", "cancelado")).toBe(1));
  it("lê payload da Cakto", () => {
    const p = parsePayment({ secret: "x", event: "purchase_approved", data: { id: "abc", status: "paid", customer: { email: "A@B.com" }, product: { name: "LabRemix Agência" } } });
    expect(p).toMatchObject({ email: "a@b.com", event: "approved", productName: "LabRemix Agência", externalId: "abc" });
  });
});
