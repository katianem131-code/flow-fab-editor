import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, FolderOpen, Film, Image as ImageIcon, ArrowLeft, BrainCircuit, Flame, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { useEditor } from "@/lib/editor/store";

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

interface AnalyzedItem {
  name: string;
  type: "video" | "image";
  sizeMB: number;
}

function AnalysisPage() {
  const storeBatchName = useEditor((s) => s.batchName);
  const [batchName, setBatchName] = useState(storeBatchName);
  const [items, setItems] = useState<AnalyzedItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("labremix:analise:batch");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.batchName) setBatchName(parsed.batchName);
          if (Array.isArray(parsed.items)) setItems(parsed.items);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar aos lotes
          </Link>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold">Análise com IA</h1>
            </div>
            {batchName && (
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5 text-primary" /> Lote: {batchName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/editor"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Ir para o Editor
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium hover:border-primary/60 transition"
            >
              Novo Lote
            </Link>
          </div>
        </div>

        {/* Itens Marcados no Lote */}
        <div className="mt-8 rounded-xl border border-border bg-surface/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Itens marcados para análise ({items.length})</h2>
            <span className="text-xs text-muted-foreground">Conteúdo filtrado no lote</span>
          </div>

          {items.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {items.map((it, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-xs"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-surface text-primary">
                    {it.type === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" title={it.name}>
                      {it.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {it.type === "video" ? "Vídeo" : "Imagem"} · {it.sizeMB.toFixed(1)} MB
                    </span>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Nenhum item específico em memória. O lote foi registrado no histórico local.
            </p>
          )}
        </div>

        {/* Módulos de IA disponíveis */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">Módulos de inteligência</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <BrainCircuit className="h-5 w-5" />
                <span>Avaliação de Ganchos & Retenção</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Examina o início do conteúdo e gera sugestões de corte e ritmo para maximizar a retenção nos primeiros 3
                segundos.
              </p>
              <span className="mt-auto inline-block text-[10px] font-semibold text-primary/80 uppercase">
                Pronto para integração
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Flame className="h-5 w-5" />
                <span>Detecção de Duplicidade & Remix</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Verifica padrões visuais e sonoros para garantir que o material final não seja sinalizado como conteúdo
                duplicado pelas redes.
              </p>
              <span className="mt-auto inline-block text-[10px] font-semibold text-primary/80 uppercase">
                Pronto para integração
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
