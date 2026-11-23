import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarClock,
  AlertCircle,
  Film,
  Instagram,
  Coins,
} from "lucide-react";
import { useSchedule } from "@/lib/editor/schedule";
import { useBilling } from "@/hooks/useBilling";
import { accountLimit } from "@/lib/billing/plans";
import { supabase } from "@/integrations/supabase/client";
import type { BatchRecord } from "@/lib/editor/batches";

interface MiniDashboardProps {
  history: BatchRecord[];
}

export function MiniDashboard({ history }: MiniDashboardProps) {
  const { user, billing } = useBilling();
  const posts = useSchedule((s) => s.posts);
  const [accounts, setAccounts] = useState<{ id: string; username: string | null }[]>([]);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      return;
    }
    supabase
      .from("instagram_accounts")
      .select("id, username")
      .then(({ data }) => setAccounts(data ?? []));
  }, [user]);

  const maxAccounts = accountLimit(billing?.plan_name, billing?.plan_status);
  const planName = billing?.plan_name || (user ? "Gratuito" : "Sem plano");
  const creditsBalance = billing?.credits_balance ?? 0;

  const { postsTodayCount, postsThisWeekCount, readyToPostCount } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000 - 1;
    const nowMs = now.getTime();

    let today = 0;
    let thisWeek = 0;
    let ready = 0;

    for (const post of posts) {
      if (post.status !== "scheduled" && post.status !== "publishing") continue;
      const postTime = new Date(post.publishAt).getTime();
      if (isNaN(postTime)) continue;

      if (postTime >= startOfToday && postTime <= endOfToday) {
        today++;
      }
      if (postTime >= startOfToday && postTime <= endOfWeek) {
        thisWeek++;
      }
      if (post.status === "scheduled" && postTime <= nowMs) {
        ready++;
      }
    }

    return { postsTodayCount: today, postsThisWeekCount: thisWeek, readyToPostCount: ready };
  }, [posts]);

  const { totalVideos, totalImages, totalBatches } = useMemo(() => {
    let videos = 0;
    let images = 0;
    for (const batch of history) {
      videos += batch.videoCount || 0;
      images += batch.imageCount || 0;
    }
    return {
      totalVideos: videos,
      totalImages: images,
      totalBatches: history.length,
    };
  }, [history]);

  return (
    <div className="mb-8 rounded-xl border border-border bg-surface/30 p-3.5 backdrop-blur-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mini Dashboard de Produção
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">Visão geral do seu estúdio</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Posts Agendados (Hoje / Semana) */}
        <Link
          to="/agenda"
          className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-background/60 p-3 transition hover:border-primary/50 hover:bg-background hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" /> Posts Agendados
              </span>
              {readyToPostCount > 0 ? (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  <AlertCircle className="h-3 w-3" /> {readyToPostCount} pronto
                  {readyToPostCount > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground transition group-hover:text-primary">
                  Ver agenda →
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {postsTodayCount}
                </span>
                <span className="text-xs text-muted-foreground">para hoje</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {postsThisWeekCount} nos próximos 7 dias
              </p>
            </div>
          </div>
          {readyToPostCount > 0 && (
            <div className="mt-2.5 rounded bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400">
              ⚡ Há post pronto no horário programado!
            </div>
          )}
        </Link>

        {/* 2. Total Produzido */}
        <a
          href="#projetos-recentes"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("projetos-recentes")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-background/60 p-3 transition hover:border-primary/50 hover:bg-background hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Film className="h-3.5 w-3.5 text-indigo-400" /> Vídeos & Produção
              </span>
              <span className="text-[10px] text-muted-foreground transition group-hover:text-primary">
                Ver lotes ↓
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {totalVideos}
                </span>
                <span className="text-xs text-muted-foreground">
                  vídeo{totalVideos === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                em {totalBatches} lote{totalBatches === 1 ? "" : "s"} · {totalImages} foto
                {totalImages === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground group-hover:text-primary transition">
            <span>Explorar histórico</span>
            <span>↓</span>
          </div>
        </a>

        {/* 3. Contas do Instagram */}
        <Link
          to="/agenda"
          className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-background/60 p-3 transition hover:border-primary/50 hover:bg-background hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Instagram className="h-3.5 w-3.5 text-pink-400" /> Instagram Conectado
              </span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                {planName}
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {accounts.length} de {maxAccounts}
                </span>
                <span className="text-xs text-muted-foreground">
                  ativa{maxAccounts === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {accounts.length === 0
                  ? "Nenhuma conta vinculada ainda"
                  : accounts.length >= maxAccounts
                  ? "Limite do plano atingido"
                  : `${maxAccounts - accounts.length} vaga(s) disponível(is)`}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground group-hover:text-primary transition">
            <span>Gerenciar contas</span>
            <span>→</span>
          </div>
        </Link>

        {/* 4. Saldo de Créditos de IA */}
        <Link
          to="/planos"
          className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-background/60 p-3 transition hover:border-accent/50 hover:bg-background hover:shadow-xs"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-accent" /> Saldo de Créditos IA
              </span>
              <span className="text-[10px] font-semibold text-accent group-hover:underline">
                Recarregar →
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight text-accent">
                  {user ? creditsBalance : "—"}
                </span>
                <span className="text-xs text-muted-foreground">créditos</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {user ? "1 crédito por vídeo exportado" : "Entre na conta para ver o saldo"}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-accent">
            <span>Ver planos e pacotes</span>
            <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

