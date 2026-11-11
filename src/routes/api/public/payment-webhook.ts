import { createFileRoute } from "@tanstack/react-router";
import { matchProduct, parsePayment } from "@/lib/billing/webhook";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYMENT_WEBHOOK_TOKEN"];
        if (!secret) return new Response("not configured", { status: 503 });
        const url = new URL(request.url);
        const given = url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? request.headers.get("x-hotmart-hottok") ?? "";
        if (!safeEqual(given, secret)) return new Response("unauthorized", { status: 401 });

        let body: any;
        try { body = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const p = parsePayment(body);
        if (!p.email || p.event === "ignored") return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: billing } = await supabaseAdmin.from("user_billing").select("*").eq("customer_email", p.email).maybeSingle();
        if (!billing) return Response.json({ ok: true, ignored: "usuario nao encontrado" });

        const { plan, pack } = matchProduct(p.productName);
        const credits = pack?.credits ?? plan?.monthlyCredits ?? 0;
        const sign = p.event === "approved" ? 1 : p.event === "refunded" ? -1 : 0;

        if (sign !== 0 && credits > 0) {
          const { error } = await supabaseAdmin.from("credit_transactions").insert({
            user_id: billing.user_id, amount: sign * credits, kind: p.event === "approved" ? "compra" : "reembolso",
            description: p.productName, external_id: p.externalId,
          });
          if (error && error.code === "23505") return Response.json({ ok: true, duplicate: true });
          if (error) return new Response("db error", { status: 500 });
        }
        const patch: { credits_balance: number; plan_name?: string; plan_status?: string; plan_renews_at?: string } = { credits_balance: Math.max(0, billing.credits_balance + sign * credits) };
        if (plan) {
          if (p.event === "approved") {
            patch.plan_name = plan.name; patch.plan_status = "ativo";
            patch.plan_renews_at = new Date(Date.now() + 31 * 864e5).toISOString();
          } else patch.plan_status = "cancelado";
        }
        await supabaseAdmin.from("user_billing").update(patch).eq("user_id", billing.user_id);
        return Response.json({ ok: true });
      },
    },
  },
});
