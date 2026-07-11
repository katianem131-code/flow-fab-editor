import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/editor/Header";
import { Scissors, Layers, Wand2, Download } from "lucide-react";

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
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
          Processa 100% no navegador
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Remix inteligente. <span className="text-primary">Resultado original.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          LabRemix é um editor em lote para até 50 vídeos. Ajuste bordas, zoom e
          proporção, processa tudo direto no seu navegador e baixa o pacote pronto.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Scissors className="h-4 w-4" /> Abrir editor
          </Link>
          <a
            href="#recursos"
            className="rounded-md border border-border px-5 py-2.5 text-sm hover:bg-surface"
          >
            Ver recursos
          </a>
        </div>
      </section>

      <section id="recursos" className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 md:grid-cols-3">
        <Feature icon={<Layers className="h-5 w-5" />} title="Lote de até 50 vídeos">
          Envie sua fila e aplique as mesmas configurações — ou personalize um a um.
        </Feature>
        <Feature icon={<Wand2 className="h-5 w-5" />} title="Bordas e proporção">
          9:16, 1:1, 4:5 ou 16:9. Zoom e posicionamento fino com preview ao vivo.
        </Feature>
        <Feature icon={<Download className="h-5 w-5" />} title="Baixa em .zip">
          Sem upload para servidor. Seus arquivos ficam no seu computador.
        </Feature>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
