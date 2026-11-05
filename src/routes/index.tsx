import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/editor/Header";
import { BatchEntry } from "@/components/editor/BatchEntry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabRemix — Remix inteligente. Resultado original." },
      {
        name: "description",
        content:
          "Edite até 50 vídeos em lote direto no navegador: bordas, zoom e proporção. Sem instalação. Sem servidor.",
      },
      { property: "og:title", content: "LabRemix — Editor de vídeos em lote" },
      {
        property: "og:description",
        content:
          "Remix inteligente. Resultado original. Processe seus vídeos em segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <BatchEntry />
    </div>
  );
}
