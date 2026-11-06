import { useState } from "react";
import { useEditor } from "@/lib/editor/store";
import { BordersTab } from "./BordersTab";
import { TitleTab, LowerTab } from "./TextTabs";
import { OverlayTab } from "./OverlayTab";
import { PresetsBar } from "./PresetsBar";
import { MasksTab } from "./MasksTab";
import { RotateCw, Lock } from "lucide-react";

type Tab = "bordas" | "titulo" | "inferior" | "overlay" | "mascaras";

export function EditPanel() {
  const [tab, setTab] = useState<Tab>("bordas");
  const items = useEditor((s) => s.items);
  const selectedId = useEditor((s) => s.selectedId);
  const editMode = useEditor((s) => s.editMode);
  const setEditMode = useEditor((s) => s.setEditMode);
  const resetAll = useEditor((s) => s.resetAll);
  const item = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <PresetsBar />

      <div className="border-b border-border p-3">
        <button
          onClick={resetAll}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs hover:bg-surface-2"
        >
          <RotateCw className="h-3 w-3" /> Resetar todas as edições
        </button>
      </div>


      <div className="grid grid-cols-5 gap-1 border-b sticky top-14 z-10 bg-background lg:static border-border p-2">
        <TabBtn active={tab === "bordas"} onClick={() => setTab("bordas")}>Bordas</TabBtn>
        <TabBtn active={tab === "titulo"} onClick={() => setTab("titulo")}>Título</TabBtn>
        <TabBtn active={tab === "inferior"} onClick={() => setTab("inferior")}>Inferior</TabBtn>
        <TabBtn active={tab === "overlay"} onClick={() => setTab("overlay")}>Overlay</TabBtn>
        <TabBtn active={tab === "mascaras"} onClick={() => setTab("mascaras")}>Máscara</TabBtn>
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
        {tab === "bordas" && <BordersTab />}
        {tab === "titulo" && <TitleTab />}
        {tab === "inferior" && <LowerTab />}
        {tab === "overlay" && <OverlayTab />}
        {tab === "mascaras" && <MasksTab />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  locked,
  onClick,
  children,
}: {
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-md px-2 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-surface-2 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {locked && (
        <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-muted-foreground" />
      )}
    </button>
  );
}
