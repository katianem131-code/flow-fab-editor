import { useEffect, useState } from "react";
import { Instagram, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMetaConfig, META_SCOPES } from "@/lib/meta/meta.functions";

interface Acc { id: string; username: string | null; page_name: string | null; profile_picture_url: string | null; token_expires_at: string | null }

const MSG: Record<string, string> = {
  cancelado: "Conexão cancelada.", "nao-configurado": "O app da Meta ainda não foi configurado.",
  expirado: "A conexão expirou, tente de novo.", erro: "Não foi possível conectar. Tente novamente.",
  "sem-conta-profissional": "Nenhuma conta profissional do Instagram ligada a uma Página foi encontrada.",
};

export function InstagramConnect() {
  const { user } = useAuth();
  const [accs, setAccs] = useState<Acc[]>([]);
  const load = () => supabase.from("instagram_accounts").select("id, username, page_name, profile_picture_url, token_expires_at").then(({ data }) => setAccs(data ?? []));
  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("meta");
    if (!m) return;
    m.startsWith("conectado") ? toast.success("Instagram conectado!") : toast.error(MSG[m] ?? "Erro na conexão.");
    window.history.replaceState({}, "", "/agenda");
  }, []);

  async function connect() {
    if (!user) return toast.error("Entre na sua conta primeiro.");
    const cfg = await getMetaConfig();
    if (!cfg.configured) return toast.error(MSG["nao-configurado"]);
    const { data, error } = await supabase.from("meta_oauth_states").insert({ user_id: user.id }).select("id").single();
    if (error || !data) return toast.error("Erro ao iniciar conexão.");
    const redirect = `${window.location.origin}/api/public/meta/callback`;
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${cfg.appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${data.id}&scope=${META_SCOPES}`;
  }
  async function remove(id: string) {
    await supabase.from("instagram_accounts").delete().eq("id", id);
    load();
  }

  return (
    <section className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Contas do Instagram</h2>
          <p className="text-[11px] text-muted-foreground">Conecte contas profissionais para publicar automaticamente.</p>
        </div>
        <button onClick={connect} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <Instagram className="h-4 w-4" /> Conectar Instagram
        </button>
      </div>
      {accs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {accs.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 text-xs">
              {a.profile_picture_url ? <img src={a.profile_picture_url} alt="" className="h-6 w-6 rounded-full" /> : <Instagram className="h-5 w-5" />}
              <span className="font-semibold">@{a.username}</span>
              <button onClick={() => remove(a.id)} aria-label="Desconectar" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
