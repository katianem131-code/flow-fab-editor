import { useState, type ReactNode } from "react";
import { Instagram, Facebook, Youtube, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Net = "instagram" | "facebook" | "tiktok" | "youtube";

const NETS: { id: Net; label: string; icon: typeof Instagram; note: string }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, note: "" },
  { id: "facebook", label: "Facebook Pages", icon: Facebook, note: "Publicação em Páginas do Facebook do seu portfólio Meta. Em preparação — ainda não é possível conectar." },
  { id: "tiktok", label: "TikTok", icon: Music2, note: "Publicação de vídeos verticais no TikTok. Em preparação — depende da aprovação do app pelo TikTok." },
  { id: "youtube", label: "YouTube Shorts", icon: Youtube, note: "Envio de Shorts para seus canais do YouTube. Em preparação — depende da autorização do Google." },
];

export function SocialAccountsHub({ instagram }: { instagram: ReactNode }) {
  const [tab, setTab] = useState<Net>("instagram");
  const cur = NETS.find((n) => n.id === tab)!;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Redes sociais</h2>
        <p className="text-[11px] text-muted-foreground">Conecte as contas onde suas postagens serão publicadas.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {NETS.map((n) => (
          <Button key={n.id} size="sm" variant={tab === n.id ? "default" : "outline"} onClick={() => setTab(n.id)} className="shrink-0">
            <n.icon className="h-4 w-4" /> {n.label}
            {n.id !== "instagram" && <span className="ml-1 rounded bg-muted px-1 text-[9px] text-muted-foreground">em breve</span>}
          </Button>
        ))}
      </div>
      {tab === "instagram" ? instagram : (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center">
          <cur.icon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-semibold">{cur.label}</div>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{cur.note}</p>
          <Button size="sm" className="mt-4" disabled>Conectar {cur.label}</Button>
        </div>
      )}
    </section>
  );
}
