import { createFileRoute } from "@tanstack/react-router";
import { CarouselEditor } from "@/components/editor/CarouselEditor";

export const Route = createFileRoute("/carrossel")({
  head: () => ({
    meta: [
      { title: "Editor de Carrossel — LabRemix" },
      {
        name: "description",
        content:
          "Troque fotos, reescreva frases e organize os slides do seu carrossel no LabRemix.",
      },
      { property: "og:title", content: "Editor de Carrossel — LabRemix" },
      {
        property: "og:description",
        content: "Edite fotos, frases, tarjas e a ordem dos slides do carrossel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CarouselEditor,
});
