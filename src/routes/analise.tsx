import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Header } from "@/components/editor/Header";

export const Route = createFileRoute("/analise")({
  head: () => ({
    meta: [
      { title: "Análise da IA — LabRemix" },
      { name: "description", content: "Envie seus lotes de vídeos e imagens para análise inteligente no LabRemix." },
      { property: "og:title", content: "Análise da IA — LabRemix" },
      { property: "og:description", content: "Análise inteligente dos seus lotes de conteúdo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

function AnalysisPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Análise da IA</h1>
        <p className="mt-3 text-muted-foreground">
          Seu lote foi registrado. Esta área está pronta para receber as regras de análise em breve.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface">Novo lote</Link>
          <Link to="/editor" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ir para o editor</Link>
        </div>
      </section>
    </div>
  );
}
