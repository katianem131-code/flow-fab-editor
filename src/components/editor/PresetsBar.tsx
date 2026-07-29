import { useEffect, useState } from "react";
import { useEditor } from "@/lib/editor/store";
import { MAX_STYLE_PRESETS } from "@/lib/editor/types";
import { Save, Trash2, Pencil, Check, X, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

export function PresetsBar() {
  const presets = useEditor((s) => s.stylePresets);
  const save = useEditor((s) => s.saveStylePreset);
  const apply = useEditor((s) => s.applyStylePreset);
  const remove = useEditor((s) => s.removeStylePreset);
  const rename = useEditor((s) => s.renameStylePreset);
  const hydrate = useEditor((s) => s.hydratePresets);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSave = () => {
    if (presets.length >= MAX_STYLE_PRESETS) {
      toast.error(`Limite de ${MAX_STYLE_PRESETS} ajustes salvos atingido.`);
      return;
    }
    save(name);
    setName("");
    setOpen(false);
    toast.success("Ajustes salvos");
  };

  return (
    <div className="border-b border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
          Meus ajustes salvos
        </div>
        <span className="text-[10px] text-muted-foreground">
          {presets.length}/{MAX_STYLE_PRESETS}
        </span>
      </div>

      {open ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Nome do ajuste"
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
          />
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-2 py-1.5 text-primary-foreground"
            aria-label="Confirmar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-2 py-1.5 text-muted-foreground"
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <Save className="h-3 w-3" /> Salvar configurações atuais
        </button>
      )}

      {presets.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {presets.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1.5"
            >
              {editingId === p.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        rename(p.id, editingName);
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs"
                  />
                  <button
                    onClick={() => {
                      rename(p.id, editingName);
                      setEditingId(null);
                    }}
                    className="text-primary"
                    aria-label="Salvar nome"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      apply(p.id);
                      toast.success(`"${p.name}" aplicado`);
                    }}
                    className="flex-1 truncate text-left text-xs hover:text-primary"
                    title="Aplicar este ajuste"
                  >
                    {p.name}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {p.borders.aspect}
                      {p.overlay.enabled ? " · overlay" : ""}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditingName(p.name);
                    }}
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
                    aria-label="Renomear"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Salva bordas, título, texto inferior e overlay neste navegador.
      </p>
    </div>
  );
}
