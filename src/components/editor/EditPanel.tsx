import { useEditor } from "@/lib/editor/store";
import { BordersTab } from "./BordersTab";
import { RotateCw } from "lucide-react";

export function EditPanel() {
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const editMode = useEditor((s) => s.editMode);
  const setEditMode = useEditor((s) => s.setEditMode);
  const resetAll = useEditor((s) => s.resetAll);
  const item = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <div className="border-b border-border p-3">
        <button
          onClick={resetAll}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs hover:bg-surface-2"
        >
          <RotateCw className="h-3 w-3" /> Resetar todas as edições
        </button>
      </div>


      <div className="border-b border-border p-2">
        <h2 className="rounded-md bg-surface-2 px-2 py-1.5 text-center text-xs font-medium text-foreground">Template</h2>
      </div>

      <div className="border-b border-border p-3">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface p-1">
          <button
            onClick={() => setEditMode("batch")}
            className={`rounded px-2 py-1.5 text-[11px] font-medium transition ${
              editMode === "batch"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Config. em lote ({items.length} vídeo{items.length === 1 ? "" : "s"})
          </button>
          <button
            onClick={() => setEditMode("single")}
            disabled={!item}
            className={`rounded px-2 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
              editMode === "single"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Só este vídeo
          </button>
        </div>
        {editMode === "single" && item && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Editando <span className="font-medium text-foreground">{item.name}</span> individualmente
          </p>
        )}
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto">
        <BordersTab />
      </div>
    </div>
  );
}

