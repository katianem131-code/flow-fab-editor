import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, KeyRound, ShieldCheck, Loader2, Unlock } from "lucide-react";
import { Header } from "@/components/editor/Header";
import { useAI, AIProvider, PROVIDER_DEFAULTS } from "@/lib/ai/settings";
import { testConnection } from "@/lib/ai/client";
import {
  loadImportSettings,
  saveImportSettings,
  PROVIDER_LABEL,
  type ImportProvider,
  type ImportSettings,
} from "@/lib/editor/importSettings";

function ImportServiceSettings() {
  const [s, setS] = useState<ImportSettings>({ provider: "demo", apiKey: "", endpoint: "" });
  useEffect(() => setS(loadImportSettings()), []);
  const field = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none";
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-5">
      <h2 className="mb-1 text-sm font-semibold">Importação por link / perfil</h2>
      <p className="mb-4 text-[11px] text-muted-foreground">
        Serviço usado para baixar vídeos do Instagram, TikTok e YouTube.
      </p>
      <div className="space-y-3">
        <label className="block text-[11px]">
          Serviço
          <select
            className={field}
            value={s.provider}
            onChange={(e) => setS({ ...s, provider: e.target.value as ImportProvider })}
          >
            {(Object.keys(PROVIDER_LABEL) as ImportProvider[]).map((p) => (
              <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
            ))}
          </select>
        </label>
        {s.provider !== "demo" && (
          <>
            <label className="block text-[11px]">
              Chave de acesso
              <input type="password" className={field} value={s.apiKey} onChange={(e) => setS({ ...s, apiKey: e.target.value })} />
            </label>
            <label className="block text-[11px]">
              Endereço do serviço (opcional)
              <input className={field} placeholder="https://..." value={s.endpoint} onChange={(e) => setS({ ...s, endpoint: e.target.value })} />
            </label>
          </>
        )}
        <button
          onClick={() => { saveImportSettings(s); toast.success("Configuração de importação salva"); }}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          Salvar
        </button>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — LabRemix" },
      {
        name: "description",
        content:
          "Configure chaves de API de IA externas (OpenAI, Gemini ou endpoint próprio) usadas para gerar títulos e transcrever áudio no LabRemix.",
      },
      { property: "og:title", content: "Painel administrativo — LabRemix" },
      {
        property: "og:description",
        content: "Gerencie provedores de IA e chaves de API do seu editor LabRemix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const hydrate = useAI((s) => s.hydrate);
  const hydrated = useAI((s) => s.hydrated);
  const isAdmin = useAI((s) => s.isAdmin);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-xl font-semibold">Painel administrativo</h1>
        <p className="mb-6 text-xs text-muted-foreground">
          Configure APIs externas de IA. As chaves ficam salvas apenas neste navegador.
        </p>
        {!hydrated ? null : isAdmin ? (
          <div className="space-y-6">
            <AISettings />
            <ImportServiceSettings />
          </div>
        ) : (
          <Gate />
        )}
      </main>
    </div>
  );
}

function Gate() {
  const unlock = useAI((s) => s.unlock);
  const setAdminCode = useAI((s) => s.setAdminCode);
  const hasAdminCode = useAI((s) => s.hasAdminCode);
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const first = !hasAdminCode();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (first) {
      if (code.length < 4) return toast.error("Use pelo menos 4 caracteres");
      if (code !== confirm) return toast.error("As senhas não conferem");
      setAdminCode(code);
      toast.success("Senha de administrador criada");
      return;
    }
    if (!unlock(code)) toast.error("Senha incorreta");
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-sm rounded-xl border border-border bg-surface/60 p-6"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-primary" />
        {first ? "Criar senha de administrador" : "Acesso restrito"}
      </div>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Senha de administrador"
        className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
      />
      {first && (
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a senha"
          className="mb-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      )}
      <button
        type="submit"
        className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {first ? "Criar e entrar" : "Entrar"}
      </button>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Proteção local deste navegador. Para contas de usuário com papel de admin no
        servidor, é preciso ativar o backend do Lovable Cloud.
      </p>
    </form>
  );
}

function AISettings() {
  const config = useAI((s) => s.config);
  const update = useAI((s) => s.update);
  const setProvider = useAI((s) => s.setProvider);
  const reset = useAI((s) => s.reset);
  const lock = useAI((s) => s.lock);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      const out = await testConnection({ ...config, enabled: true });
      toast.success(`Conexão OK — resposta: ${out.slice(0, 40)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no teste");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-surface/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> IA externa
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            Ativar recursos de IA
          </label>
        </div>

        <Field label="Provedor">
          <div className="grid grid-cols-3 gap-1 rounded-md bg-surface p-1">
            {(["openai", "gemini", "custom"] as AIProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded px-2 py-1.5 text-[11px] font-medium capitalize transition ${
                  config.provider === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "custom" ? "Personalizado" : p}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Endpoint base (compatível com OpenAI)">
          <input
            value={config.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder={PROVIDER_DEFAULTS.openai.baseUrl}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
          />
        </Field>

        <Field label="Chave de API">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Modelo de texto (títulos)">
            <input
              value={config.textModel}
              onChange={(e) => update({ textModel: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
            />
          </Field>
          <Field label="Modelo de áudio (transcrição)">
            <input
              value={config.audioModel}
              onChange={(e) => update({ audioModel: e.target.value })}
              placeholder="whisper-1"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
            />
          </Field>
        </div>

        <Field label="Instrução do sistema (estilo dos títulos)">
          <textarea
            value={config.systemPrompt}
            onChange={(e) => update({ systemPrompt: e.target.value })}
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs"
          />
        </Field>

        <div className="mt-4 flex gap-2">
          <button
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {testing && <Loader2 className="h-3 w-3 animate-spin" />} Testar conexão
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-2"
          >
            Restaurar padrões
          </button>
          <button
            onClick={lock}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-2"
          >
            <Unlock className="h-3 w-3" /> Sair
          </button>
        </div>
      </section>

      <p className="text-[10px] text-muted-foreground">
        A chave é usada direto do navegador para chamar o provedor. Use uma chave com
        limite de gasto e não compartilhe este dispositivo.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
