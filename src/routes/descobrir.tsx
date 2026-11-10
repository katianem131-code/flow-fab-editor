import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Toaster, toast } from "sonner";
import { Search, Lightbulb, Eye, Heart, MessageCircle, Loader2, Copy, Type, Download, X, Check } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { searchVirals, getTopComments, type ViralReel, type ViralComment } from "@/lib/discover/discover.functions";
import { fetchSocialVideo } from "@/lib/editor/linkImport";
import { useEditor } from "@/lib/editor/store";

export const Route = createFileRoute("/descobrir")({
  head: () => ({
    meta: [
      { title: "Descobrir virais — LabRemix" },
      { name: "description", content: "Encontre Reels com mais visualizações por perfil ou hashtag e extraia headlines dos comentários." },
      { property: "og:title", content: "Descobrir virais — LabRemix" },
      { property: "og:description", content: "Pesquise Reels virais e leve direto para o editor LabRemix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

const fmt = (n: number) => Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n);

function DiscoverPage() {
  const router = useRouter();
  const search = useServerFn(searchVirals);
  const addFiles = useEditor((s) => s.addFiles);
  const [mode, setMode] = useState<"profile" | "hashtag">("profile");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [reels, setReels] = useState<ViralReel[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulb, setBulb] = useState<ViralReel | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const run = async () => {
    if (!query.trim()) return;
    setBusy(true); setPicked(new Set());
    try {
      const r = await search({ data: { mode, query } });
      setReels(r.reels);
      if (r.error) toast.error(r.error);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha na busca"); }
    finally { setBusy(false); }
  };

  const toggle = (c: string) => setPicked((p) => { const n = new Set(p); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const importPicked = async () => {
    const list = reels.filter((r) => picked.has(r.code));
    const files: File[] = []; let fails = 0;
    for (let i = 0; i < list.length; i++) {
      setImporting(`Baixando ${i + 1}/${list.length}…`);
      try { files.push(await fetchSocialVideo(list[i].url)); } catch { fails++; }
    }
    setImporting(null);
    if (files.length) { addFiles(files); toast.success(`${files.length} vídeo(s) enviados ao editor`); router.navigate({ to: "/editor" }); }
    if (fails) toast.error(`${fails} vídeo(s) não puderam ser baixados`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <Header />
      <main className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6">
        <h1 className="text-xl font-semibold">Descobrir virais</h1>
        <p className="mb-4 text-xs text-muted-foreground">Busque Reels por perfil ou hashtag, ordenados por visualizações.</p>
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface/60 p-3 sm:flex-row">
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {(["profile", "hashtag"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded px-3 py-1.5 ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {m === "profile" ? "Por perfil" : "Por hashtag"}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={mode === "profile" ? "@usuario" : "#motivacional"}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <button onClick={run} disabled={busy} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </button>
        </div>

        {picked.size > 0 && (
          <div className="sticky top-16 z-10 mb-4 flex items-center justify-between rounded-lg border border-accent bg-background p-3 text-sm">
            <span>{picked.size} selecionado(s)</span>
            <button onClick={importPicked} disabled={!!importing} className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {importing ?? "Levar ao editor"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {reels.map((r) => (
            <div key={r.code} className={`overflow-hidden rounded-xl border bg-surface/60 ${picked.has(r.code) ? "border-primary" : "border-border"}`}>
              <button onClick={() => toggle(r.code)} className="relative block aspect-[9/16] w-full bg-muted">
                {r.thumb && <img src={r.thumb} referrerPolicy="no-referrer" loading="lazy" alt={r.caption || r.code} className="h-full w-full object-cover" />}
                <span className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md border ${picked.has(r.code) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/70"}`}>
                  {picked.has(r.code) && <Check className="h-4 w-4" />}
                </span>
              </button>
              <div className="space-y-1.5 p-2 text-[11px]">
                <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-primary">@{r.username}</a>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(r.plays)}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(r.likes)}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{fmt(r.comments)}</span>
                </div>
                <button onClick={() => setBulb(r)} className="flex w-full items-center justify-center gap-1 rounded-md border border-border py-1 text-accent hover:border-accent">
                  <Lightbulb className="h-3.5 w-3.5" /> Headlines
                </button>
              </div>
            </div>
          ))}
        </div>
        {!reels.length && !busy && <p className="py-16 text-center text-sm text-muted-foreground">Faça uma busca para ver os vídeos.</p>}
      </main>
      {bulb && <HeadlinesModal reel={bulb} onClose={() => setBulb(null)} />}
    </div>
  );
}

function HeadlinesModal({ reel, onClose }: { reel: ViralReel; onClose: () => void }) {
  const router = useRouter();
  const fetchComments = useServerFn(getTopComments);
  const updateGlobalTitle = useEditor((s) => s.updateGlobalTitle);
  const [state, setState] = useState<{ loading: boolean; list: ViralComment[]; error?: string }>({ loading: true, list: [] });
  useEffect(() => {
    fetchComments({ data: { code: reel.code } })
      .then((r) => setState({ loading: false, list: r.comments, error: r.error }))
      .catch(() => setState({ loading: false, list: [], error: "Falha ao carregar comentários" }));
  }, [reel.code]);
  const useAsTitle = (t: string) => {
    updateGlobalTitle({ enabled: true, lines: t, text: t });
    toast.success("Título definido no editor");
    router.navigate({ to: "/editor" });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-accent" /> Headlines nos comentários</h2>
          <button onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 overflow-y-auto p-4">
          {state.loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
          {state.error && !state.list.length && <p className="text-center text-xs text-muted-foreground">{state.error}</p>}
          {state.list.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3 text-xs">
              <p className="mb-2 whitespace-pre-wrap">{c.text}</p>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(c.likes)} · @{c.username}</span>
                <span className="flex gap-1">
                  <button onClick={() => { navigator.clipboard.writeText(c.text); toast.success("Copiado"); }} className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:text-foreground"><Copy className="h-3 w-3" />Copiar</button>
                  <button onClick={() => useAsTitle(c.text)} className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-primary-foreground"><Type className="h-3 w-3" />Usar como título</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
