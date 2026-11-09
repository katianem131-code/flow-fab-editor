import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightbulb, Search, Play, Heart, MessageCircle, Eye, Copy } from "lucide-react";
import { Header } from "@/components/editor/Header";

type Viral = {
  id: number;
  creator: string;
  caption: string;
  views: string;
  likes: string;
  comments: string;
  color: string;
};

const MOCK_VIRALS: Viral[] = [
  { id: 1, creator: "@fycraes", caption: "Se algum dia me tocar a morrer", views: "6,2M", likes: "349,9K", comments: "5,4K", color: "from-orange-300 to-rose-700" },
  { id: 2, creator: "@luancastco", caption: "Sem pena do coitado, senão o coitado vira você", views: "649,1K", likes: "45K", comments: "100", color: "from-slate-300 to-sky-700" },
  { id: 3, creator: "@deverson_goncalves", caption: "O momento que ninguém esperava", views: "1,8M", likes: "36,6K", comments: "52", color: "from-red-500 to-slate-900" },
  { id: 4, creator: "@jardimartins", caption: "Se acostume com a ideia", views: "368,9K", likes: "34,8K", comments: "169", color: "from-amber-200 to-cyan-700" },
  { id: 5, creator: "@iracaramipho", caption: "Nunca subestime um empreendedor de 30 e poucos anos", views: "429,4K", likes: "7,1K", comments: "40", color: "from-sky-200 to-blue-700" },
  { id: 6, creator: "@vivianycarvalho", caption: "Normalize perder o encanto por uma amizade", views: "3,8M", likes: "417,4K", comments: "1,9K", color: "from-slate-700 to-rose-300" },
];

export const Route = createFileRoute("/descobrir")({
  component: DiscoverPage,
});

function DiscoverPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Encontre conteúdo para suas páginas</p>
        <div className="mt-2 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Descobrir virais</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Analise tendências, encontre referências e escolha os próximos vídeos para o seu lote.
            </p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Voltar aos lotes</Link>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex flex-wrap gap-2">
            {["Por assunto", "Por hashtag", "Perfis parecidos", "Perfis salvos"].map((tab, i) => (
              <button key={tab} className={`rounded-lg border px-4 py-3 text-left text-xs ${i === 0 ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
                <span className="block font-semibold">{tab}</span>
                <span className="mt-1 block text-[10px]">{i === 0 ? "Vídeos sobre o seu nicho" : "Em breve nesta versão"}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3">
              <Search className="h-4 w-4 text-primary" />
              <input className="w-full bg-transparent py-3 text-sm outline-none" defaultValue="motivacional" placeholder="O que procurar?" />
            </label>
            <button className="rounded-md bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground hover:opacity-90">Buscar referências</button>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div><span className="text-sm font-semibold">{MOCK_VIRALS.length} resultados</span><span className="ml-2 text-xs text-muted-foreground">0 selecionados</span></div>
          <div className="flex items-center gap-2">
            <select className="rounded-md border border-border bg-surface px-3 py-2 text-xs"><option>Ordenar por relevância</option><option>Mais visualizados</option><option>Mais comentados</option></select>
            <button className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">Marcar todos</button>
          </div>
        </div>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {MOCK_VIRALS.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className={`relative aspect-[9/14] bg-gradient-to-br ${video.color}`}>
                <div className="absolute inset-0 bg-black/15" />
                <button className="absolute right-2 top-2 h-5 w-5 rounded-full border border-white/80" aria-label="Selecionar vídeo" />
                <button className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><Play className="ml-0.5 h-4 w-4 fill-current" /></button>
                <button className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-yellow-300 text-slate-900 shadow-lg" aria-label="Ver headlines nos comentários"><Lightbulb className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 min-h-8 text-xs font-medium">{video.caption}</p>
                <p className="text-[10px] text-muted-foreground">{video.creator}</p>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{video.views}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{video.likes}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{video.comments}</span>
                </div>
                <button className="flex w-full items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[10px] text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" />Copiar headline</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
