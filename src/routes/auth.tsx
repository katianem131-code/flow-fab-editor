import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Scissors } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — LabRemix" },
      { name: "description", content: "Acesse sua conta LabRemix ou crie uma nova para salvar seus lotes e agendamentos." },
      { property: "og:title", content: "Entrar — LabRemix" },
      { property: "og:description", content: "Acesse ou crie sua conta LabRemix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        if (!data.session) setInfo("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Enviamos um link para redefinir sua senha.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg === "Invalid login credentials" ? "E-mail ou senha incorretos" : msg);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-semibold">LabRemix</span>
        </Link>
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          {info && <p className="rounded-md border border-primary/40 bg-primary/10 p-2 text-sm">{info}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Cadastrar" : "Enviar link"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-1 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button className="hover:text-foreground" onClick={() => setMode("forgot")}>Esqueci minha senha</button>
              <button className="hover:text-foreground" onClick={() => setMode("signup")}>Não tem conta? Cadastre-se</button>
            </>
          )}
          {mode !== "login" && (
            <button className="hover:text-foreground" onClick={() => setMode("login")}>Já tenho conta — Entrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
