import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  FolderOpen,
  Film,
  Image as ImageIcon,
  ArrowLeft,
  BrainCircuit,
  Flame,
  CheckCircle2,
  CalendarClock,
  Copy,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/editor/Header";
import { useEditor } from "@/lib/editor/store";
import { loadBatchFiles } from "@/lib/editor/batchStorage";
import { formatSlideLabel, sharedCaption, type BatchAssetInput, type BatchAssetMetadata } from "@/lib/editor/media";
import { BatchDownloadControls, DownloadAssetButton } from "@/components/editor/BatchDownloadControls";
import { BatchScheduleDialog } from "@/components/editor/BatchScheduleDialog";
import { useMediaPreviews } from "@/lib/editor/useMediaPreviews";

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

interface AnalyzedItem extends BatchAssetMetadata {
  file?: File;
}

function AnalysisPage() {
  const navigate = useNavigate();
  const storeBatchName = useEditor((s) => s.batchName);
  const [batchName, setBatchName] = useState(storeBatchName);
  const [batchId, setBatchId] = useState("");
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [caption, setCaption] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = sessionStorage.getItem("labremix:analise:batch");
        if (!raw) return;
        const parsed = JSON.parse(raw) as { batchId?: string; batchName?: string; items?: BatchAssetMetadata[] };
        if (parsed.batchName) setBatchName(parsed.batchName);
        if (parsed.batchId) setBatchId(parsed.batchId);
        const metadata = Array.isArray(parsed.items) ? parsed.items : [];
        if (!cancelled) {
          setItems(metadata);
          setCaption(sharedCaption(metadata));
        }
        if (parsed.batchId) {
          const files = await loadBatchFiles(parsed.batchId);
          if (cancelled || !files.length) return;
          setItems((current) => files.map((asset, index) => ({
            ...(current.find((item) => item.id === asset.id) ?? current[index] ?? {}),
            id: asset.id,
            name: asset.file.name,
            type: asset.kind,
            sizeMB: asset.file.size / (1024 * 1024),
            source: asset.source ?? current[index]?.source,
            file: asset.file,
          })));
        }
      } catch {
        // Keep the metadata view when local files are no longer available.
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const previews = useMediaPreviews(items.flatMap((item) => item.file ? [{ id: item.id, file: item.file, kind: item.type }] : []));

  const downloadableAssets = items.flatMap((item): BatchAssetInput[] => item.file
    ? [{ id: item.id, file: item.file, kind: item.type, source: item.source }]
    : []);

  const openCarousel = (item: AnalyzedItem) => {
    if (!batchId || !item.file) {
      toast.error("Abra o lote novamente para recuperar as imagens antes de editar.");
      return;
    }
    const postId = item.source?.postId;
    const group = items.filter((candidate) => candidate.file && candidate.type === "image" && (
      postId ? candidate.source?.postId === postId : candidate.id === item.id
    ));
    const payload = {
      projectId: item.source?.carouselProjectId ?? `carrossel-${batchId}-${postId ?? item.id}`,
      batchId,
      batchName,
      assetIds: group.map((candidate) => candidate.id),
      postId,
      caption: sharedCaption(group) || caption,
    };
    sessionStorage.setItem("labremix:carrossel:open", JSON.stringify(payload));
    navigate({ to: "/carrossel" });
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="flex w-fit items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar aos lotes
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary"><Sparkles className="h-4 w-4" /></span>
              <h1 className="text-2xl font-bold">Análise com IA</h1>
            </div>
            {batchName && (
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground"><FolderOpen className="h-3.5 w-3.5 text-primary" /> Lote: {batchName}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setScheduleOpen(true)}
              disabled={!downloadableAssets.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <CalendarClock className="h-3.5 w-3.5" /> Agendar conteúdo
            </button>
            <Link to="/editor" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">Ir para o Editor</Link>
            <Link to="/" className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium transition hover:border-primary/60">Novo Lote</Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-surface/30 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Conteúdo para modelar ({items.length})</h2>
              <p className="text-xs text-muted-foreground">Slides do carrossel permanecem agrupados e na ordem original.</p>
            </div>
            <BatchDownloadControls assets={downloadableAssets} batchName={batchName || "lote-analise"} />
          </div>

          {items.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const preview = previews.find((entry) => entry.id === item.id)?.url;
                const asset = downloadableAssets.find((entry) => entry.id === item.id);
                const slide = formatSlideLabel(item.source);
                return (
                  <li key={item.id} className="overflow-hidden rounded-lg border border-border bg-background text-xs">
                    <div className="relative aspect-[4/3] bg-surface">
                      {preview && item.type === "image" ? (
                        <img src={preview} alt={item.name} className="h-full w-full object-contain" />
                      ) : preview ? (
                        <video src={preview} muted controls className="h-full w-full object-contain" />
                      ) : (
                        <div className="grid h-full place-items-center text-primary">
                          {item.type === "video" ? <Film className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
                        </div>
                      )}
                      {slide && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-background/90 px-2 py-1 text-[10px] font-semibold text-primary">
                          <Layers3 className="h-3 w-3" /> {slide}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium" title={item.name}>{item.name}</p>
                          <span className="text-[10px] text-muted-foreground">{item.type === "video" ? "Vídeo" : "Imagem"} · {item.sizeMB.toFixed(1)} MB</span>
                        </div>
                        {asset && <DownloadAssetButton asset={asset} />}
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      </div>
                      {item.type === "image" && (
                        <button
                          type="button"
                          onClick={() => openCarousel(item)}
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/50 bg-primary/5 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                        >
                          <Layers3 className="h-3.5 w-3.5" /> {item.source?.slideCount && item.source.slideCount > 1 ? "Editar carrossel" : "Editar imagem"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum item específico em memória. Abra um lote e envie o conteúdo para análise.</p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface/30 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Legenda de referência</h2>
              <p className="text-xs text-muted-foreground">Use como base para modelar sua própria copy. Se o serviço não fornecer a legenda, você pode colá-la aqui.</p>
            </div>
            <button
              onClick={() => { void navigator.clipboard.writeText(caption); toast.success("Legenda copiada"); }}
              disabled={!caption}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:border-primary disabled:opacity-50"
            >
              <Copy className="h-3 w-3" /> Copiar
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={6}
            placeholder="Cole aqui a legenda original ou escreva uma referência para análise…"
            className="mt-3 w-full rounded-md border border-border bg-background p-3 text-xs leading-relaxed focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">Módulos de inteligência</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 font-semibold text-primary"><BrainCircuit className="h-5 w-5" /><span>Avaliação de Ganchos & Retenção</span></div>
              <p className="text-xs leading-relaxed text-muted-foreground">Examina o início do conteúdo e gera sugestões de corte e ritmo para maximizar a retenção nos primeiros 3 segundos.</p>
              <span className="mt-auto inline-block text-[10px] font-semibold uppercase text-primary/80">Pronto para integração</span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-5">
              <div className="flex items-center gap-2 font-semibold text-primary"><Flame className="h-5 w-5" /><span>Detecção de Duplicidade & Remix</span></div>
              <p className="text-xs leading-relaxed text-muted-foreground">Verifica padrões visuais e sonoros para garantir que o material final não seja sinalizado como conteúdo duplicado pelas redes.</p>
              <span className="mt-auto inline-block text-[10px] font-semibold uppercase text-primary/80">Pronto para integração</span>
            </div>
          </div>
        </div>
      </section>
      <BatchScheduleDialog assets={downloadableAssets} open={scheduleOpen} onOpenChange={setScheduleOpen} initialCaption={caption} />
    </div>
  );
}
