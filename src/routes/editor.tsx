// Editor em lote — sem sidebar esquerda; materiais ficam na fita horizontal (BatchMaterialsBar)
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/editor/Header";
import { BatchMaterialsBar } from "@/components/editor/BatchMaterialsBar";
import { PreviewStage } from "@/components/editor/PreviewStage";
import { EditPanel } from "@/components/editor/EditPanel";
import { ProcessBar } from "@/components/editor/ProcessBar";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor em lote — LabRemix" },
      {
        name: "description",
        content:
          "Edite até 50 vídeos em lote no navegador: bordas, zoom e proporção. Sem instalação, sem upload para servidor.",
      },
      { property: "og:title", content: "Editor em lote — LabRemix" },
      {
        property: "og:description",
        content:
          "Remix inteligente. Resultado original. Processe seus vídeos direto no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  return (
    <div className="dark flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground lg:h-auto lg:min-h-screen lg:overflow-visible">
      <Header />
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:grid lg:grid-cols-[1fr_360px] lg:overflow-hidden">
        <main className="flex min-h-0 shrink-0 flex-col border-b border-border lg:border-b-0 lg:border-r lg:overflow-hidden">
          {/* Only the adjustment panel scrolls on mobile, keeping the preview visible. */}
          <div className="bg-background lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            <PreviewStage />
          </div>
          <BatchMaterialsBar />
        </main>
        <aside aria-label="Ajustes do vídeo" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-surface/40 lg:overflow-hidden">
          <div className="lg:flex-1 lg:overflow-y-auto">
            <EditPanel />
          </div>
          <ProcessBar />
        </aside>
      </div>
    </div>
  );
}
