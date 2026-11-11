import { CREDIT_PACKS, PLANS, type CreditPack, type Plan } from "./plans";

export type PaymentEvent = "approved" | "refunded" | "canceled" | "ignored";
export interface ParsedPayment { email: string | null; event: PaymentEvent; productName: string; externalId: string | null }

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
type Any = Record<string, any>;

/** Lê payloads de Kiwify, Hotmart, Eduzz e formato genérico. */
export function parsePayment(body: Any): ParsedPayment {
  const d: Any = body?.data ?? body;
  const email: string | null =
    d?.Customer?.email ?? d?.buyer?.email ?? d?.customer?.email ?? d?.cus_email ?? d?.email ?? null;
  const productName: string =
    d?.Product?.product_name ?? d?.product?.name ?? d?.product_name ?? d?.prod_name ?? d?.product ?? "";
  const externalId: string | null = String(
    d?.order_id ?? d?.purchase?.transaction ?? d?.trans_cod ?? d?.transaction_id ?? d?.id ?? "",
  ) || null;
  const raw = norm(String(body?.event ?? d?.order_status ?? d?.purchase?.status ?? d?.trans_status ?? d?.status ?? ""));
  let event: PaymentEvent = "ignored";
  if (/(approved|aprovad|paid|pago|complete|order_approved|subscription_renewed|renewed)/.test(raw)) event = "approved";
  if (/(refund|reembols|chargeback|estorn)/.test(raw)) event = "refunded";
  if (/(cancel|expired|subscription_canceled)/.test(raw)) event = "canceled";
  return { email: email ? String(email).trim().toLowerCase() : null, event, productName: String(productName), externalId };
}

export function matchProduct(productName: string): { plan?: Plan; pack?: CreditPack } {
  const n = norm(productName);
  const pack = CREDIT_PACKS.find((p) => n.includes(norm(p.match)));
  if (pack) return { pack };
  const plan = [...PLANS].sort((a, b) => b.match.length - a.match.length).find((p) => n.includes(norm(p.match)));
  return { plan };
}
