import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Trash2, Plus } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { InstagramConnect } from "@/components/editor/InstagramConnect";
import {
  useSchedule,
  countByStatus,
  nextPost,
  STATUS_LABEL,
  FORMAT_LABEL,
  type PostStatus,
  type ScheduledPost,
} from "@/lib/editor/schedule";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de posts — LabRemix" },
      { name: "description", content: "Acompanhe, ajuste e gerencie as publicações agendadas no Instagram." },
      { property: "og:title", content: "Agenda de posts — LabRemix" },
      { property: "og:description", content: "Central de agendamento e publicação em massa do LabRemix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

type View = "list" | "week" | "month";
type Filter = "all" | "pending" | PostStatus;

const STATUS_STYLE: Record<PostStatus, string> = {
  scheduled: "bg-primary/15 text-primary",
  publishing: "bg-secondary text-foreground",
  published: "bg-success/15 text-success",
  error: "bg-destructive/15 text-destructive",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function PostRow({ p }: { p: ScheduledPost }) {
  const remove = useSchedule((s) => s.removePost);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.headline || p.videoName}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {fmt(p.publishAt)} · {p.accounts.join(", ")} · {FORMAT_LABEL[p.format]}
        </p>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[p.status]}`}>
        {STATUS_LABEL[p.status]}
      </span>
      <button aria-label="Excluir" onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function CalendarGrid({ posts, days }: { posts: ScheduledPost[]; days: number }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((d) => {
        const dayPosts = posts.filter((p) => new Date(p.publishAt).toDateString() === d.toDateString());
        return (
          <div key={d.toISOString()} className="min-h-20 rounded-md border border-border bg-surface p-1.5">
            <p className="text-[10px] text-muted-foreground">
              {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
            </p>
            {dayPosts.map((p) => (
              <p key={p.id} className={`mt-1 truncate rounded px-1 text-[10px] ${STATUS_STYLE[p.status]}`}>
                {new Date(p.publishAt).toLocaleTimeString("pt-BR", { timeStyle: "short" })} {p.headline}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AgendaPage() {
  const { posts, accounts, hydrate } = useSchedule();
  useEffect(() => hydrate(), [hydrate]);
  const [view, setView] = useState<View>("list");
  const [account, setAccount] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = countByStatus(posts);
  const next = nextPost(posts);
  const filtered = useMemo(
    () =>
      posts
        .filter((p) => account === "all" || p.accounts.includes(account))
        .filter((p) =>
          filter === "all" ? true : filter === "pending" ? p.status === "scheduled" || p.status === "error" : p.status === filter,
        )
        .sort((a, b) => a.publishAt.localeCompare(b.publishAt)),
    [posts, account, filter],
  );

  const stats: [string, number][] = [
    ["Todos", counts.all],
    ["Agendados", counts.scheduled],
    ["Publicando", counts.publishing],
    ["Publicados", counts.published],
    ["Com erro", counts.error],
  ];
  const sel = "rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl space-y-5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Publicação em massa</p>
            <h1 className="text-2xl font-bold">Sua agenda de posts</h1>
            <p className="text-xs text-muted-foreground">Veja o que vai ao ar, ajuste os horários e acompanhe suas publicações.</p>
          </div>
          <Link to="/editor" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-3 w-3" /> Novo agendamento
          </Link>
        </div>

        <InstagramConnect />

        <div className="grid gap-3 md:grid-cols-[1fr_280px]">
          <section className="rounded-xl border border-border bg-gradient-to-br from-surface to-background p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Próxima publicação</p>
            {next ? (
              <>
                <h2 className="mt-3 text-lg font-semibold">{next.headline || next.videoName}</h2>
                <p className="text-xs text-primary">{fmt(next.publishAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{next.accounts.join(", ")}</p>
                {next.caption && <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{next.caption}</p>}
              </>
            ) : (
              <>
                <h2 className="mt-3 text-lg font-semibold">Espaço para o próximo post</h2>
                <p className="text-xs text-muted-foreground">Nenhuma publicação agendada ainda.</p>
              </>
            )}
          </section>
          <div className="grid gap-2">
            {stats.map(([l, n]) => (
              <div key={l} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{l}</span>
                <span className="text-lg font-bold">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-xl border border-border bg-surface/60 p-4">
          <h2 className="text-base font-semibold">Publicações</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">Horários no seu fuso local</p>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-border py-3">
            <div className="flex rounded-md border border-border p-0.5">
              {(["list", "week", "month"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1 text-xs ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {v === "list" ? "Lista" : v === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
            <select className={sel} value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="all">Todas as contas</option>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className={sel} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes e com erro</option>
              {(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarCheck className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">Nenhum post neste filtro</p>
              <p className="text-xs text-muted-foreground">Processe vídeos no editor e clique em Agendar.</p>
            </div>
          ) : view === "list" ? (
            <div className="space-y-2">{filtered.map((p) => <PostRow key={p.id} p={p} />)}</div>
          ) : (
            <CalendarGrid posts={filtered} days={view === "week" ? 7 : 35} />
          )}
        </section>
        <p className="text-center text-[11px] text-muted-foreground">
          Posts agendados com uma conta conectada são publicados automaticamente no horário escolhido.
        </p>
      </main>
    </div>
  );
}
