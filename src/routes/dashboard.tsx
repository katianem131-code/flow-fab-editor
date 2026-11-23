import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Download, Layers3, Pickaxe, FolderKanban } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { MiniDashboard } from "@/components/editor/MiniDashboard";
import { loadBatches, type BatchRecord } from "@/lib/editor/batches";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LabRemix" },
      { name: "description", content: "Veja suas quantidades de vídeos, lotes, posts agendados, contas e créditos." },
      { property: "og:title", content: "Dashboard de Produção — LabRemix" },
      { property: "og:description", content: "Visão geral da sua produção de conteúdo no LabRemix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const ACTIONS = [
  { label: "Baixar / Novo lote", icon: Download, to: "/", hash: "baixar" },
  { label: "Projetos", icon: FolderKanban, to: "/" },
  { label: "Garimpar virais", icon: Pickaxe, to: "/descobrir" },
  { label: "Novo carrossel", icon: Layers3, to: "/carrossel" },
  { label: "Ver agenda", icon: CalendarClock, to: "/agenda" },
] as const;

function DashboardPage() {
  const [history, setHistory] = useState<BatchRecord[]>([]);
  useEffect(() => setHistory(loadBatches()), []);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="mb-1 text-xl font-semibold">Dashboard</h1>
        <p className="mb-6 text-sm text-muted-foreground">Visão geral da sua produção.</p>
        <MiniDashboard history={history} />
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACTIONS.map((a) => (
            <Link key={a.label} to={a.to} hash={"hash" in a ? a.hash : undefined}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface/40 p-4 text-center text-sm font-medium hover:border-primary/60 transition">
              <a.icon className="h-5 w-5 text-primary" />{a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
