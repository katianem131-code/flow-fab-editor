import { useEffect, useState } from "react";
import { Download, Loader2, Package, Check } from "lucide-react";
import { toast } from "sonner";
import type { BatchAssetInput } from "@/lib/editor/media";
import { deliverFile, zipBlobs } from "@/lib/editor/zip";

export function BatchDownloadControls({ assets, batchName }: { assets: BatchAssetInput[]; batchName: string }) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<Blob | null>(null);
  const signature = assets.map((asset) => `${asset.id}:${asset.file.size}`).join("|");

  useEffect(() => setReady(null), [signature]);
  if (!assets.length) return null;

  const prepare = async () => {
    setBusy(true);
    try {
      const entries: { name: string; blob: Blob }[] = assets.map((asset) => ({ name: asset.file.name, blob: asset.file }));
      const captions = [...new Set(assets.map((asset) => asset.source?.caption?.trim()).filter(Boolean))] as string[];
      if (captions.length) {
        entries.push({
          name: "legendas-originais.txt",
          blob: new Blob([captions.join("\n\n---\n\n")], { type: "text/plain;charset=utf-8" }),
        });
      }
      entries.push({
        name: "conteudo-do-lote.json",
        blob: new Blob([JSON.stringify(assets.map((asset) => ({
          name: asset.file.name,
          type: asset.kind,
          source: asset.source,
        })), null, 2)], { type: "application/json" }),
      });
      setReady(await zipBlobs(entries, "Conteúdo original importado com LabRemix. A ordem e as legendas de referência estão nos arquivos de metadados.\n"));
    } catch {
      toast.error("Não foi possível preparar o pacote de download.");
    } finally {
      setBusy(false);
    }
  };

  if (ready) {
    return (
      <button
        type="button"
        onClick={() => deliverFile(ready, `${safeFilename(batchName || "lote-labremix")}.zip`)}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90"
      >
        <Check className="h-3.5 w-3.5" /> Baixar ZIP pronto ({assets.length})
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={prepare}
      disabled={busy}
      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/60 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5 text-primary" />}
      {busy ? "Preparando downloads…" : `Preparar ZIP (${assets.length})`}
    </button>
  );
}

export function DownloadAssetButton({ asset }: { asset: BatchAssetInput }) {
  return (
    <button
      type="button"
      aria-label={`Baixar ${asset.file.name}`}
      title="Baixar arquivo original"
      onClick={(event) => {
        event.stopPropagation();
        deliverFile(asset.file, asset.file.name);
      }}
      className="p-1 text-muted-foreground transition hover:text-primary"
    >
      <Download className="h-4 w-4" />
    </button>
  );
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}
