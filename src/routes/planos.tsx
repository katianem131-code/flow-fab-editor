import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Coins } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { CREDIT_PACKS, PLANS } from "@/lib/billing/plans";
import { useBilling } from "@/hooks/useBilling";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e créditos — LabRemix" },
      { name: "description", content: "Escolha seu plano LabRemix e compre créditos extras para processar mais vídeos." },
      { property: "og:title", content: "Planos e créditos — LabRemix" },
      { property: "og:description", content: "Planos mensais com créditos inclusos e pacotes extras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanosPage,
});

function buy(url: string, email?: string) {
  if (!url) return alert("Checkout ainda não configurado.");
  const u = new URL(url);
  if (email) u.searchParams.set("email", email);
  window.open(u.toString(), "_blank");
}

function PlanosPage() {
  const { user, billing } = useBilling();
  const email = user?.email ?? undefined;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Assinatura</p>
          <h1 className="text-2xl font-bold">Planos e créditos</h1>
          <p className="text-xs text-muted-foreground">Cada vídeo exportado usa 1 crédito. Compre com o mesmo e-mail da sua conta para liberar na hora.</p>
        </div>
        {user ? (
          <section className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-4">
            <div><p className="text-[11px] text-muted-foreground">Saldo</p><p className="flex items-center gap-1 text-2xl font-bold text-accent"><Coins className="h-5 w-5" />{billing?.credits_balance ?? 0}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Plano</p><p className="font-semibold">{billing?.plan_name ?? "Sem plano"} <span className="text-xs text-muted-foreground">({billing?.plan_status ?? "inativo"})</span></p></div>
            {billing?.plan_renews_at && <div><p className="text-[11px] text-muted-foreground">Renova em</p><p className="font-semibold">{new Date(billing.plan_renews_at).toLocaleDateString("pt-BR")}</p></div>}
          </section>
        ) : (
          <p className="rounded-lg border border-primary/40 p-3 text-sm"><Link to="/auth" className="font-semibold text-primary">Entre na sua conta</Link> para ver seu saldo antes de comprar.</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-border bg-surface p-5">
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="text-2xl font-bold text-primary">{p.price}</p>
              <ul className="my-4 space-y-1 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-accent" />{f}</li>)}
              </ul>
              <button onClick={() => buy(p.checkoutUrl, email)} className="mt-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Assinar {p.name}</button>
            </div>
          ))}
        </div>
        <section>
          <h2 className="mb-2 text-base font-semibold">Créditos extras</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CREDIT_PACKS.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.price}</p></div>
                <button onClick={() => buy(c.checkoutUrl, email)} className="rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">Comprar</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
