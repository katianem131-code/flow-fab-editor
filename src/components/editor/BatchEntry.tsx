import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Upload, Link2, Image as ImageIcon, Film, FolderOpen, Scissors, Sparkles, Trash2, Clock } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { LinkImportDialog } from "./LinkImportDialog";
import {
  buildBatchLabel,
  loadBatches,
  removeBatch,
  saveBatch,
  type BatchDestination,
  type BatchRecord,
} from "@/lib/editor/batches";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,image/*";

export function BatchEntry() {
  const navigate = useNavigate();
  const items = useEditor((s) => s.items);
  const addFiles = useEditor((s) => s.addFiles);
  const clearAll = useEditor((s) => s.clearAll);
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<BatchRecord[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setHistory(loadBatches());
    setNow(new Date());
  }, []);

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const vids = arr.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name));
    const imgs = arr.filter((f) => f.type.startsWith("image/"));
    if (vids.length) addFiles(vids);
    if (imgs.length) setImages((p) => [...p, ...imgs]);
  };

  const total = items.length + images.length;
  const label = buildBatchLabel(now ?? new Date(0), name);

  const go = (dest: BatchDestination) => {
    const rec: BatchRecord = {
      id: crypto.randomUUID(),
      name: label,
      createdAt: new Date().toISOString(),
      videoCount: items.length,
      imageCount: images.length,
      linkCount: 0,
      fileNames: [...items.map((i) => i.file.name), ...images.map((f) => f.name)],
      destination: dest,
    };
    setHistory(saveBatch(rec));
    navigate({ to: dest === "editor" ? "/editor" : "/analise" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <StepTitle n={1} title="Traga seu material" sub="Vídeos, imagens ou links de postagens." />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-4 grid gap-4 rounded-xl border-2 border-dashed p-8 md:grid-cols-2 ${dragging ? "border-primary bg-primary/5" : "border-border bg-surface/40"}`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 hover:border-primary/60"
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-semibold">Enviar vídeos ou imagens</span>
          <span className="text-xs text-muted-foreground">Clique ou arraste arquivos aqui · MP4, MOV, WebM, JPG, PNG</span>
        </button>
        <button
          onClick={() => setLinkOpen(true)}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 hover:border-primary/60"
        >
          <Link2 className="h-8 w-8 text-primary" />
          <span className="font-semibold">Importar por link</span>
          <span className="text-xs text-muted-foreground">Postagens do Instagram, TikTok, YouTube…</span>
        </button>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {total > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1"><Film className="h-4 w-4" /> {items.length} vídeo(s)</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1"><ImageIcon className="h-4 w-4" /> {images.length} imagem(ns)</span>
            <button onClick={() => { clearAll(); setImages([]); }} className="ml-auto text-xs text-muted-foreground hover:text-destructive">Limpar</button>
          </div>

          <div className="mt-10">
            <StepTitle n={2} title="Identifique o lote" sub="A pasta recebe data e hora automaticamente." />
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do lote (ex: Reels virais)"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <span className="inline-flex items-center gap-2 rounded-md bg-surface px-3 py-2 font-mono text-xs">
                <FolderOpen className="h-4 w-4 text-primary" /> {label}
              </span>
            </div>
          </div>

          <div className="mt-10">
            <StepTitle n={3} title="O que deseja fazer?" sub="Escolha o destino deste lote." />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DestCard icon={<Scissors className="h-6 w-6" />} title="Editar" desc="Bordas, títulos, overlay, templates e anti-duplicidade." onClick={() => go("editor")} disabled={items.length === 0} hint={items.length === 0 ? "O editor precisa de ao menos 1 vídeo" : undefined} />
              <DestCard icon={<Sparkles className="h-6 w-6" />} title="Análise da IA" desc="Envie o lote para análise inteligente." onClick={() => go("ai")} />
            </div>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="mt-14">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Lotes recentes</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {history.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs">{b.name}</span>
                <span className="text-xs text-muted-foreground">{b.videoCount} vídeo(s) · {b.imageCount} imagem(ns)</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {b.destination === "ai" ? "Análise IA" : "Editor"}
                </span>
                <button aria-label="Remover lote" onClick={() => setHistory(removeBatch(b.id))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Os arquivos ficam disponíveis enquanto a página estiver aberta; o histórico guarda nome, data e conteúdo do lote.</p>
        </div>
      )}

      <LinkImportDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

function StepTitle({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function DestCard({ icon, title, desc, onClick, disabled, hint }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 p-6 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{desc}</span>
      {hint && <span className="text-xs text-destructive">{hint}</span>}
    </button>
  );
}
