import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Upload,
  Link2,
  Image as ImageIcon,
  Film,
  FolderOpen,
  Scissors,
  Sparkles,
  Trash2,
  Clock,
  Check,
  CheckSquare,
  Square,
  Edit2,
  Save,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { LinkImportDialog } from "./LinkImportDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buildBatchLabel,
  loadBatches,
  removeBatch,
  saveBatch,
  updateBatchName,
  type BatchDestination,
  type BatchRecord,
} from "@/lib/editor/batches";
import { saveBatchFiles, loadBatchFiles, deleteBatchFiles } from "@/lib/editor/batchStorage";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,image/*";

interface ImageEntry {
  id: string;
  file: File;
  name: string;
  sizeMB: number;
  previewUrl: string;
}

export function BatchEntry() {
  const navigate = useNavigate();
  const items = useEditor((s) => s.items);
  const addFiles = useEditor((s) => s.addFiles);
  const setItems = useEditor((s) => s.setItems);
  const removeItem = useEditor((s) => s.removeItem);
  const clearAll = useEditor((s) => s.clearAll);
  const setBatch = useEditor((s) => s.setBatch);

  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [name, setName] = useState("");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<BatchRecord[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Seleção e marcação de conteúdo (checkboxes)
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  // Estado para renomear lotes existentes na lista de projetos
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Modal de opções ao clicar no projeto
  const [selectedProject, setSelectedProject] = useState<BatchRecord | null>(null);
  const [projectRename, setProjectRename] = useState("");
  const [projectSavedNotice, setProjectSavedNotice] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectMissingNotice, setProjectMissingNotice] = useState(false);

  useEffect(() => {
    setHistory(loadBatches());
    setNow(new Date());
  }, []);

  // Garante que novos arquivos adicionados comecem marcados por padrão
  useEffect(() => {
    setMarkedIds((prev) => {
      const next = new Set(prev);
      items.forEach((it) => {
        if (!prev.has(it.id)) next.add(it.id);
      });
      images.forEach((img) => {
        if (!prev.has(img.id)) next.add(img.id);
      });
      return next;
    });
  }, [items, images]);

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const vids = arr.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name));
    const imgs = arr.filter((f) => f.type.startsWith("image/"));

    if (vids.length) {
      addFiles(vids);
      if (activeBatchId) {
        saveBatchFiles(activeBatchId, vids);
      }
    }

    if (imgs.length) {
      const newImgEntries: ImageEntry[] = imgs.map((file) => ({
        id: Math.random().toString(36).slice(2, 10),
        file,
        name: file.name,
        sizeMB: file.size / (1024 * 1024),
        previewUrl: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImgEntries]);
    }
  };

  const total = items.length + images.length;
  const currentLabel = buildBatchLabel(now ?? new Date(0), name);

  // Marcar / desmarcar item
  const toggleMark = (id: string) => {
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAll = () => {
    const all = new Set<string>();
    items.forEach((it) => all.add(it.id));
    images.forEach((img) => all.add(img.id));
    setMarkedIds(all);
  };

  const unmarkAll = () => {
    setMarkedIds(new Set());
  };

  // Remover imagem específica
  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setMarkedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Limpar todo o conteúdo atual
  const handleClearCurrent = () => {
    clearAll();
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setMarkedIds(new Set());
    setActiveBatchId(null);
    setName("");
    setSavedNotice(false);
  };

  // Salvar a identificação do lote (Projeto)
  const handleSaveBatch = () => {
    const batchId = activeBatchId ?? crypto.randomUUID();
    setActiveBatchId(batchId);

    const existing = history.find((b) => b.id === batchId);
    const rec: BatchRecord = {
      id: batchId,
      name: currentLabel,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      videoCount: items.length,
      imageCount: images.length,
      linkCount: existing?.linkCount ?? 0,
      fileNames: [...items.map((i) => i.file.name), ...images.map((f) => f.name)],
      destination: existing?.destination,
    };

    const updated = saveBatch(rec);
    setHistory(updated);
    setBatch(batchId, currentLabel);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // Renomear lote existente no histórico
  const startRenameHistoryBatch = (b: BatchRecord) => {
    setEditingId(b.id);
    setEditingNameValue(b.name);
  };

  const handleSaveHistoryRename = (id: string) => {
    if (!editingNameValue.trim()) return;
    const updated = updateBatchName(id, editingNameValue);
    setHistory(updated);
    setEditingId(null);
    if (activeBatchId === id) {
      setName(editingNameValue);
      setBatch(id, editingNameValue);
    }
  };

  // Abrir modal de opções ao clicar no projeto
  const handleOpenProject = (b: BatchRecord) => {
    setSelectedProject(b);
    setProjectRename(b.name);
    setProjectSavedNotice(false);
    setProjectMissingNotice(false);
    setLoadingProject(false);
  };

  const handleSaveProjectRename = () => {
    if (!selectedProject || !projectRename.trim()) return;
    const updated = updateBatchName(selectedProject.id, projectRename.trim());
    setHistory(updated);
    setSelectedProject((prev) => (prev ? { ...prev, name: projectRename.trim() } : null));
    if (activeBatchId === selectedProject.id) {
      setName(projectRename.trim());
      setBatch(selectedProject.id, projectRename.trim());
    }
    setProjectSavedNotice(true);
    setTimeout(() => setProjectSavedNotice(false), 2500);
  };

  const handleExecuteProjectOption = async (dest: BatchDestination) => {
    if (!selectedProject) return;

    if (dest === "editor") {
      // 1. Se os itens do lote selecionado já estiverem na memória do editor nesta sessão:
      if (activeBatchId === selectedProject.id && items.length > 0) {
        setBatch(selectedProject.id, selectedProject.name);
        saveBatch({ ...selectedProject, destination: dest });
        setSelectedProject(null);
        navigate({ to: "/editor" });
        return;
      }

      // 2. Tenta carregar os arquivos reais salvos no IndexedDB:
      setLoadingProject(true);
      const loadedFiles = await loadBatchFiles(selectedProject.id);
      setLoadingProject(false);

      if (loadedFiles.length > 0) {
        setBatch(selectedProject.id, selectedProject.name);
        saveBatch({ ...selectedProject, destination: dest });
        setActiveBatchId(selectedProject.id);
        setItems([]);
        addFiles(loadedFiles);
        setSelectedProject(null);
        navigate({ to: "/editor" });
        return;
      }

      // 3. Se os arquivos não estiverem no cache/IndexedDB:
      // Exibe aviso claro no modal para o usuário selecionar os arquivos do lote
      setProjectMissingNotice(true);
      return;
    }

    setBatch(selectedProject.id, selectedProject.name);
    saveBatch({ ...selectedProject, destination: dest });
    setSelectedProject(null);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "labremix:analise:batch",
        JSON.stringify({
          batchId: selectedProject.id,
          batchName: selectedProject.name,
          items: (selectedProject.fileNames || []).map((name) => ({
            name,
            type: /\.(mp4|mov|webm)$/i.test(name) ? "video" : "image",
            sizeMB: 0,
          })),
        }),
      );
    }
    navigate({ to: "/analise" });
  };

  const handleAddFilesToProject = (b: BatchRecord) => {
    setActiveBatchId(b.id);
    setName(b.name.replace(/^Lote_\d{4}-\d{2}-\d{2}_\d+h\d+_?/, ""));
    setBatch(b.id, b.name);
    setSelectedProject(null);
    inputRef.current?.click();
  };

  // Itens marcados
  const markedVideos = useMemo(() => items.filter((it) => markedIds.has(it.id)), [items, markedIds]);
  const markedImages = useMemo(() => images.filter((img) => markedIds.has(img.id)), [images, markedIds]);
  const markedCount = markedVideos.length + markedImages.length;

  // Ação da Opção 3 (O que deseja fazer?)
  const go = (dest: BatchDestination) => {
    const batchId = activeBatchId ?? crypto.randomUUID();

    // Salva o lote com as contagens dos itens marcados
    const rec: BatchRecord = {
      id: batchId,
      name: currentLabel,
      createdAt: new Date().toISOString(),
      videoCount: markedVideos.length,
      imageCount: markedImages.length,
      linkCount: 0,
      fileNames: [...markedVideos.map((i) => i.name), ...markedImages.map((f) => f.name)],
      destination: dest,
    };
    setHistory(saveBatch(rec));
    setBatch(batchId, currentLabel);

    // Salva arquivos reais no IndexedDB para restaurar caso o lote seja reaberto mais tarde
    if (markedVideos.length > 0) {
      saveBatchFiles(batchId, markedVideos.map((v) => v.file));
    }

    if (dest === "editor") {
      // Deixar no editor somente os vídeos marcados
      items.forEach((it) => {
        if (!markedIds.has(it.id)) {
          URL.revokeObjectURL(it.previewUrl);
          if (it.outputUrl) URL.revokeObjectURL(it.outputUrl);
        }
      });
      setItems(markedVideos);
      navigate({ to: "/editor" });
    } else {
      // Salvar metadados para a tela de análise de IA
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "labremix:analise:batch",
          JSON.stringify({
            batchId,
            batchName: currentLabel,
            items: [
              ...markedVideos.map((v) => ({ name: v.name, type: "video", sizeMB: v.sizeMB })),
              ...markedImages.map((img) => ({ name: img.name, type: "image", sizeMB: img.sizeMB })),
            ],
          }),
        );
      }
      navigate({ to: "/analise" });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Passo 1: Traga seu material */}
      <StepTitle n={1} title="Traga seu material" sub="Vídeos, imagens ou links de postagens para este lote." />
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
        className={`mt-4 grid gap-4 rounded-xl border-2 border-dashed p-8 md:grid-cols-2 transition ${
          dragging ? "border-primary bg-primary/5" : "border-border bg-surface/40"
        }`}
      >
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 hover:border-primary/60 transition"
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="font-semibold">Enviar vídeos ou imagens</span>
          <span className="text-xs text-muted-foreground">
            Clique ou arraste arquivos aqui · MP4, MOV, WebM, JPG, PNG
          </span>
        </button>
        <button
          onClick={() => setLinkOpen(true)}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 hover:border-primary/60 transition"
        >
          <Link2 className="h-8 w-8 text-primary" />
          <span className="font-semibold">Importar por link</span>
          <span className="text-xs text-muted-foreground">Postagens do Instagram, TikTok, YouTube…</span>
        </button>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Passo 2: Identifique e Salve o Lote */}
      {total > 0 && (
        <div className="mt-10 rounded-xl border border-border bg-surface/30 p-6">
          <StepTitle
            n={2}
            title="Identifique e renomeie o lote"
            sub="Dê um nome ao projeto e clique em Salvar para fixar a identificação."
          />
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBatch();
                }}
                placeholder="Nome do lote (ex: Reels Virais, Anúncios Novembro)"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
              />
            </div>
            <button
              onClick={handleSaveBatch}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              <Save className="h-4 w-4" /> Salvar lote
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5 text-primary" /> Identificador: {currentLabel}
            </span>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500 animate-in fade-in">
                <Check className="h-4 w-4" /> Lote e identificação salvos com sucesso!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo do Lote: Marcar o Conteúdo */}
      {total > 0 && (
        <div className="mt-10 rounded-xl border border-border bg-surface/30 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Marcar conteúdo do lote</h3>
              <p className="text-xs text-muted-foreground">
                Selecione quais itens deste lote você deseja enviar para Edição ou Análise com IA.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:text-primary transition"
              >
                <CheckSquare className="h-3.5 w-3.5" /> Marcar todos
              </button>
              <button
                onClick={unmarkAll}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:text-muted-foreground transition"
              >
                <Square className="h-3.5 w-3.5" /> Desmarcar todos
              </button>
              <button
                onClick={handleClearCurrent}
                className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar arquivos
              </button>
            </div>
          </div>

          {/* Resumo de Seleção */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-2.5 text-xs">
            <span className="font-semibold text-foreground">
              {markedCount} de {total} item(ns) marcado(s)
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{markedVideos.length} vídeo(s)</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{markedImages.length} imagem(ns)</span>
          </div>

          {/* Lista de Itens com Checkboxes */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Vídeos */}
            {items.map((it) => {
              const isMarked = markedIds.has(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => toggleMark(it.id)}
                  className={`group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    isMarked
                      ? "border-primary/80 bg-primary/5 shadow-sm"
                      : "border-border bg-background opacity-60 hover:opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={isMarked ? "Desmarcar" : "Marcar"}
                    className="shrink-0 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMark(it.id);
                    }}
                  >
                    {isMarked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>

                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-surface text-primary">
                    <Film className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={it.name}>
                      {it.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="rounded bg-blue-500/10 px-1.5 py-0.2 text-blue-400 font-semibold">Vídeo</span>
                      <span>{it.sizeMB.toFixed(1)} MB</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Remover vídeo"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(it.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {/* Imagens */}
            {images.map((img) => {
              const isMarked = markedIds.has(img.id);
              return (
                <div
                  key={img.id}
                  onClick={() => toggleMark(img.id)}
                  className={`group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    isMarked
                      ? "border-primary/80 bg-primary/5 shadow-sm"
                      : "border-border bg-background opacity-60 hover:opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={isMarked ? "Desmarcar" : "Marcar"}
                    className="shrink-0 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMark(img.id);
                    }}
                  >
                    {isMarked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </button>

                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-surface">
                    <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={img.name}>
                      {img.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-emerald-400 font-semibold">
                        Imagem
                      </span>
                      <span>{img.sizeMB.toFixed(1)} MB</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Passo 3: O que deseja fazer? (Após escolher o lote e marcar o conteúdo) */}
      {total > 0 && (
        <div className="mt-10 rounded-xl border border-border bg-surface/30 p-6">
          <StepTitle
            n={3}
            title="O que deseja fazer?"
            sub="Após escolher o lote e marcar o conteúdo, decida para onde direcionar os itens marcados."
          />

          {markedCount === 0 && (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Nenhum item está marcado acima. Marque pelo menos um arquivo para prosseguir.</span>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <DestCard
              icon={<Scissors className="h-6 w-6" />}
              title="Editar"
              desc="Bordas, títulos, overlay, templates e anti-duplicidade."
              badge={`${markedVideos.length} vídeo(s) marcado(s)`}
              onClick={() => go("editor")}
              disabled={markedVideos.length === 0}
              hint={
                markedVideos.length === 0
                  ? items.length === 0
                    ? "O editor precisa de ao menos 1 vídeo no lote"
                    : "Marque ao menos 1 vídeo acima para abrir o editor"
                  : undefined
              }
            />
            <DestCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Análise com IA"
              desc="Envie o lote e conteúdo marcados para análise inteligente."
              badge={`${markedCount} item(ns) marcado(s)`}
              onClick={() => go("ai")}
              disabled={markedCount === 0}
              hint={markedCount === 0 ? "Marque ao menos 1 item acima para enviar à IA" : undefined}
            />
          </div>
        </div>
      )}

      {/* Lotes / Projetos Recentes (com seleção e renomeação direta) */}
      {history.length > 0 && (
        <div className="mt-14">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Lotes / Projetos recentes</h3>
            <span className="text-xs text-muted-foreground">{history.length} projeto(s) registrado(s)</span>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface/20">
            {history.map((b) => {
              const isSelected = activeBatchId === b.id;
              const isEditing = editingId === b.id;

              return (
                <li
                  key={b.id}
                  onClick={() => handleOpenProject(b)}
                  className={`group flex flex-wrap items-center gap-3 px-4 py-3 text-sm cursor-pointer transition ${
                    isSelected ? "bg-primary/10" : "hover:bg-surface/60"
                  }`}
                >
                  <FolderOpen className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary transition"}`} />

                  {/* Nome ou Campo de Edição */}
                  {isEditing ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveHistoryRename(b.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="rounded border border-primary bg-background px-2 py-1 font-mono text-xs outline-none"
                      />
                      <button
                        onClick={() => handleSaveHistoryRename(b.id)}
                        className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold group-hover:text-primary transition">{b.name}</span>
                        {isSelected && (
                          <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {b.videoCount} vídeo(s) · {b.imageCount} imagem(ns)
                      </span>
                    </div>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    {/* Botão Escolher Opção */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProject(b);
                      }}
                      className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition shadow-sm"
                    >
                      Escolher opção
                    </button>

                    {/* Botão Renomear */}
                    {!isEditing && (
                      <button
                        aria-label="Renomear lote"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenameHistoryBatch(b);
                        }}
                        title="Renomear lote e salvar"
                        className="p-1.5 text-muted-foreground hover:text-foreground transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Destino prévio */}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {b.destination === "ai" ? "IA" : "Editor"}
                    </span>

                    {/* Remover */}
                    <button
                      aria-label="Remover lote"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = removeBatch(b.id);
                        deleteBatchFiles(b.id);
                        setHistory(updated);
                        if (activeBatchId === b.id) {
                          setActiveBatchId(null);
                        }
                      }}
                      title="Excluir lote"
                      className="p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            O histórico guarda nomes, datas e registros dos projetos. Você pode escolher qualquer lote ou renomeá-lo a
            qualquer momento.
          </p>
        </div>
      )}

      {/* Modal de Escolha de Opção ao Clicar no Projeto */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-lg border-border bg-background p-6 max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4 max-sm:pt-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FolderOpen className="h-5 w-5 text-primary shrink-0" />
              <span className="min-w-0 truncate">{selectedProject?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedProject && (
                <>
                  Criado em {formatBatchDate(selectedProject.createdAt)} · {selectedProject.videoCount} vídeo(s) · {selectedProject.imageCount} imagem(ns)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="min-w-0 space-y-4 pt-2">
              {/* Renomear o projeto se desejar */}
              <div className="rounded-lg border border-border bg-surface/40 p-3">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome do Lote / Projeto
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    value={projectRename}
                    onChange={(e) => setProjectRename(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveProjectRename();
                    }}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleSaveProjectRename}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                  >
                    <Save className="h-3.5 w-3.5" /> Salvar
                  </button>
                </div>
                {projectSavedNotice && (
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-green-500 animate-in fade-in">
                    <Check className="h-3.5 w-3.5" /> Nome atualizado com sucesso!
                  </span>
                )}
              </div>

              {/* Opções de Ação */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Escolha o que deseja fazer:
                </p>
                <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                  <button
                    disabled={loadingProject}
                    onClick={() => handleExecuteProjectOption("editor")}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 p-4 text-left transition hover:border-primary hover:bg-primary/5 cursor-pointer disabled:opacity-50"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition">
                      {loadingProject ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scissors className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition">
                        {loadingProject ? "Carregando arquivos..." : "Editar"}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Bordas, títulos, overlay, templates e anti-duplicidade.
                      </p>
                    </div>
                    <span className="mt-auto text-[11px] font-semibold text-primary">Abrir no Editor →</span>
                  </button>

                  <button
                    onClick={() => handleExecuteProjectOption("ai")}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 p-4 text-left transition hover:border-primary hover:bg-primary/5 cursor-pointer"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition">
                        Análise com IA
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Análise inteligente de ganchos, retenção e duplicidade.
                      </p>
                    </div>
                    <span className="mt-auto text-[11px] font-semibold text-primary">Abrir Análise →</span>
                  </button>
                </div>

                {/* Aviso quando o lote anterior não tem os vídeos em cache */}
                {projectMissingNotice && (
                  <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Arquivos de vídeo não encontrados na memória</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-amber-200/90 leading-relaxed">
                      Este lote foi criado em uma sessão anterior e os vídeos não estão mais no cache do navegador. Para continuar editando este lote com seus vídeos, selecione os arquivos do seu computador:
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => handleAddFilesToProject(selectedProject)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> Selecionar arquivos deste lote
                      </button>
                      <button
                        onClick={() => {
                          setBatch(selectedProject.id, selectedProject.name);
                          setSelectedProject(null);
                          navigate({ to: "/editor" });
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline transition"
                      >
                        Abrir no editor mesmo assim
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Arquivos registrados no lote */}
              {selectedProject.fileNames && selectedProject.fileNames.length > 0 && (
                <div className="rounded-lg border border-border bg-surface/20 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate font-semibold text-foreground">Arquivos registrados ({selectedProject.fileNames.length})</span>
                    <span className="shrink-0">{selectedProject.videoCount} vídeo(s) · {selectedProject.imageCount} imagem(ns)</span>
                  </div>
                  <ul className="mt-2 max-h-28 overflow-y-auto space-y-1 text-xs pr-1">
                    {selectedProject.fileNames.map((fn, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                        {/\.(mp4|mov|webm)$/i.test(fn) ? (
                          <Film className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="min-w-0 truncate">{fn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ações inferiores */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <button
                  onClick={() => handleAddFilesToProject(selectedProject)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <Upload className="h-3.5 w-3.5" /> Adicionar novos arquivos a este lote
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LinkImportDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

function StepTitle({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function DestCard({
  icon,
  title,
  desc,
  badge,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface/60 p-6 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-primary">{icon}</span>
        {badge && (
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground">
            {badge}
          </span>
        )}
      </div>
      <span className="text-base font-semibold group-hover:text-primary transition">{title}</span>
      <span className="text-sm text-muted-foreground">{desc}</span>
      {hint && <span className="text-xs text-destructive">{hint}</span>}
    </button>
  );
}

function formatBatchDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
