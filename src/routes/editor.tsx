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
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-[1fr_360px] lg:overflow-hidden">
        <main className="flex flex-col min-h-0 lg:overflow-hidden border-b lg:border-b-0 lg:border-r border-border">
          {/* No mobile o preview fica fixo no topo (abaixo do header) enquanto os controles rolam */}
          <div className="sticky top-14 z-10 bg-background lg:static lg:z-auto lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            <PreviewStage />
          </div>
          <BatchMaterialsBar />
        </main>
        <aside className="flex flex-col bg-surface/40 lg:overflow-hidden">
          <div className="lg:flex-1 lg:overflow-y-auto">
            <EditPanel />
          </div>
          <ProcessBar />
        </aside>
      </div>
      <Toaster theme="dark" richColors position="top-center" />
    </div>
  );
}
