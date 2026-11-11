import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — LabRemix" },
      { name: "description", content: "Defina uma nova senha para sua conta LabRemix." },
      { property: "og:title", content: "Nova senha — LabRemix" },
      { property: "og:description", content: "Redefina sua senha LabRemix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/", replace: true });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Definir nova senha</h1>
        <div className="space-y-1">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>Salvar senha</Button>
      </form>
    </div>
  );
}
