import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Link2, X, Loader2, User, Check, History, CheckCircle2, Pencil, Plus } from "lucide-react";
import {
  useImportSettings,
  loadHistory,
  pushHistory,
  clearHistory,
  PROVIDER_LABEL,
  type ImportHistoryEntry,
} from "@/lib/editor/importSettings";
import { useEditor } from "@/lib/editor/store";
import {
  parseLinks,
  normalizeUsername,
  fetchDirectMedia,
  fetchSocialMedia,
  PLATFORM_LABEL,
  type ImportedPost,
} from "@/lib/editor/linkImport";

type Tab = "links" | "profile";
type Found = { id: string; caption: string; duration: string; url: string };

export function LinkImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported?: (posts: ImportedPost[]) => void;
}) {
  const router = useRouter();
  const addFiles = useEditor((s) => s.addFiles);
  const [tab, setTab] = useState<Tab>("links");
  const [text, setText] = useState("");
  const [network, setNetwork] = useState<"instagram" | "tiktok">("instagram");
  const [user, setUser] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [found, setFound] = useState<Found[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [doneCount, setDoneCount] = useState(0);
  const [doneVideos, setDoneVideos] = useState(0);

  const links = useMemo(() => parseLinks(text), [text]);
  const settings = useImportSettings();
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  useEffect(() => {
    if (open) {
      setHistory(loadHistory());
      setDoneCount(0);
      setDoneVideos(0);
    }
  }, [open]);
  if (!open) return null;

  const importLinks = async () => {
    setBusy(true);
    setMsg(null);
    setDoneCount(0);
    const posts: ImportedPost[] = [];
    const fails: string[] = [];
    let i = 0;
    for (const link of links) {
      i++;
      if (link.platform === "unknown") continue;
      setMsg(`Baixando postagem ${i}/${links.length}…`);
      try {
        posts.push(link.platform === "direct" ? await fetchDirectMedia(link.url) : await fetchSocialMedia(link.url));
      } catch (error) {
        fails.push(`${PLATFORM_LABEL[link.platform]}: ${error instanceof Error ? error.message : "falha"}`);
      }
    }
    const media = posts.flatMap((post) => post.files);
    const videos = media.filter((item) => item.kind === "video");
    const images = media.length - videos.length;
    if (posts.length) {
      if (onImported) onImported(posts);
      else if (videos.length) addFiles(videos.map((item) => item.file), videos.map((item) => item.source));
    }
    setHistory(pushHistory({ kind: "links", label: `${links.length} link(s)`, count: media.length }));
    setBusy(false);
    if (media.length) {
      setDoneCount(media.length);
      setDoneVideos(videos.length);
    }
    setMsg(
      `${media.length} item(ns) adicionado(s): ${videos.length} vídeo(s) e ${images} imagem(ns).` +
        (fails.length ? ` Falharam: ${fails.join(" · ")}` : ""),
    );
  };

  const goToEditor = () => {
    onClose();
    router.navigate({ to: "/editor" });
  };

  const stayInBatch = () => {
    setDoneCount(0);
    setDoneVideos(0);
    setText("");
    setMsg(null);
    onClose();
  };

  const searchProfile = () => {
    const name = normalizeUsername(user);
    if (!name) return;
    // Demonstration only until a real profile extraction provider is connected.
    const list = Array.from({ length: count }, (_, i) => ({
      id: `${name}-${i}`,
      caption: `Reel ${i + 1} de @${name}`,
      duration: `0:${String(15 + ((i * 7) % 40)).padStart(2, "0")}`,
      url: `https://www.${network}.com/${name}/${i}`,
    }));
    setFound(list);
    setHistory(pushHistory({ kind: "profile", label: `@${name} (${network})`, count: list.length }));
    setPicked(new Set(list.map((f) => f.id)));
    setMsg("Modo demonstração: conecte um serviço de extração no Admin para buscar vídeos reais.");
  };

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Importar postagens por link ou perfil</h3>
            <p className="text-[10px] text-muted-foreground">Vídeos, fotos e todos os slides do carrossel · Serviço: {PROVIDER_LABEL[settings.provider]}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {doneCount > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/10 p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> {doneCount} item(ns) adicionado(s) ao lote!
            </p>
            <p className="text-[11px] text-muted-foreground">
              Fotos e slides já estão no lote para download, análise ou rascunho de agendamento.
            </p>
            <div className={`grid grid-cols-1 gap-2 ${doneVideos ? "sm:grid-cols-2" : ""}`}>
              {doneVideos > 0 && (
                <button onClick={goToEditor} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110">
                  <Pencil className="h-3.5 w-3.5" /> Editar {doneVideos} vídeo(s)
                </button>
              )}
              <button onClick={stayInBatch} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium hover:border-primary/60">
                <Plus className="h-3.5 w-3.5 text-primary" /> Continuar no lote
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 rounded-md bg-background p-1 text-xs">
          {(["links", "profile"] as Tab[]).map((item) => (
            <button key={item} onClick={() => { setTab(item); setMsg(null); }} className={`rounded px-2 py-1.5 font-medium ${tab === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {item === "links" ? "Colar links" : "Por perfil"}
            </button>
          ))}
        </div>

        {tab === "links" ? (
          <>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              placeholder={"Um link por linha\nhttps://www.instagram.com/p/carrossel/...\nhttps://www.instagram.com/reel/..."}
              className="w-full rounded-md border border-border bg-background p-2 text-xs focus:border-primary focus:outline-none"
            />
            {links.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px]">
                {links.map((link) => (
                  <li key={link.url} className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 ${link.platform === "unknown" ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>{PLATFORM_LABEL[link.platform]}</span>
                    <span className="truncate text-muted-foreground">{link.url}</span>
                  </li>
                ))}
              </ul>
            )}
            <button disabled={!links.length || busy} onClick={importLinks} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Importar {links.length} postagem(ns)
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <select value={network} onChange={(event) => setNetwork(event.target.value as "instagram" | "tiktok")} className="rounded-md border border-border bg-background px-2 text-xs">
                <option value="instagram">Instagram</option><option value="tiktok">TikTok</option>
              </select>
              <input value={user} onChange={(event) => setUser(event.target.value)} placeholder="@perfil" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none" />
              <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="rounded-md border border-border bg-background px-2 text-xs">
                {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n} vídeos</option>)}
              </select>
            </div>
            <button onClick={searchProfile} disabled={!user.trim()} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><User className="h-3 w-3" /> Buscar vídeos</button>
            {found.length > 0 && (
              <>
                <ul className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto">
                  {found.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => toggle(item.id)} className={`relative flex aspect-[9/16] w-full flex-col justify-end rounded-md border bg-background p-1.5 text-left text-[10px] ${picked.has(item.id) ? "border-primary" : "border-border opacity-60"}`}>
                        {picked.has(item.id) && <Check className="absolute right-1 top-1 h-3 w-3 text-primary" />}
                        <span className="truncate">{item.caption}</span><span className="text-muted-foreground">{item.duration}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button disabled className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground opacity-50" title="Requer serviço de extração">Adicionar {picked.size} selecionado(s) à fila</button>
              </>
            )}
          </>
        )}
        {msg && <p className="max-h-20 overflow-y-auto text-[11px] text-muted-foreground">{msg}</p>}
        {history.length > 0 && (
          <div className="border-t border-border pt-2">
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1"><History className="h-3 w-3" /> Histórico</span>
              <button onClick={() => { clearHistory(); setHistory([]); }} className="normal-case hover:text-destructive">Limpar</button>
            </div>
            <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[11px]">
              {history.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">{entry.kind === "profile" ? "Perfil" : "Links"} · {entry.label}</span>
                  <span className="shrink-0">{entry.count} · {new Date(entry.at).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function LinkImportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium hover:border-primary/60">
      <Link2 className="h-3.5 w-3.5 text-primary" /> Importar por link / perfil
    </button>
  );
}
