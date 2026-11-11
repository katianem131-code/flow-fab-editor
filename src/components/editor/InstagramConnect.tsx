import { useEffect, useState } from "react";
import { Instagram, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMetaConfig, startMetaConnect } from "@/lib/meta/meta.functions";
import { Button } from "@/components/ui/button";

interface Acc { id: string; username: string | null; page_name: string | null; profile_picture_url: string | null; token_expires_at: string | null }

const MSG: Record<string, string> = {
  cancelado: "Conexão cancelada.", "nao-configurado": "Configuração Meta incompleta. Configure o login empresarial antes de conectar.",
  expirado: "A conexão expirou, tente de novo.", erro: "Não foi possível conectar. Tente novamente.",
  "sem-conta-profissional": "Nenhuma conta profissional do Instagram ligada a uma Página foi encontrada.",
};

export function InstagramConnect() {
  const { user } = useAuth();
  const [accs, setAccs] = useState<Acc[]>([]);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getMetaConfig().then((cfg) => setConfigured(cfg.configured)).catch(() => setConfigured(false)); }, []);
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
    if (!configured) return toast.error(MSG["nao-configurado"]);
    setBusy(true);
    try { const result = await startMetaConnect({ data: { origin: window.location.origin } }); window.location.assign(result.url); }
    catch { toast.error("Não foi possível iniciar conexão. Confira a configuração Meta e entre novamente."); }
    finally { setBusy(false); }
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
          <p className="text-[11px] text-muted-foreground">{configured ? "Contas profissionais do Instagram" : MSG["nao-configurado"]}</p>
        </div>
        <Button size="sm" onClick={connect} disabled={!configured || busy}>
          <Instagram className="h-4 w-4" /> Conectar Instagram
        </Button>
      </div>
      {accs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {accs.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 text-xs">
              {a.profile_picture_url ? <img src={a.profile_picture_url} alt="" className="h-6 w-6 rounded-full" /> : <Instagram className="h-5 w-5" />}
              <span className="font-semibold">@{a.username}</span>
              <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label="Desconectar" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
