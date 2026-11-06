// Editor em lote — sem sidebar esquerda; materiais ficam na fita horizontal (BatchMaterialsBar)
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/editor/Header";
import { BatchMaterialsBar } from "@/components/editor/BatchMaterialsBar";
import { PreviewStage } from "@/components/editor/PreviewStage";
import { EditPanel } from "@/components/editor/EditPanel";
import { ProcessBar } from "@/components/editor/ProcessBar";
import { Toaster } from "sonner";

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
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[1fr_360px] overflow-hidden">
        <main className="flex flex-col min-h-0 overflow-hidden border-r border-border">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PreviewStage />
          </div>
          <BatchMaterialsBar />
        </main>
        <aside className="flex flex-col bg-surface/40 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <EditPanel />
          </div>
          <ProcessBar />
        </aside>
      </div>
      <Toaster theme="dark" richColors position="top-center" />
    </div>
  );
}
