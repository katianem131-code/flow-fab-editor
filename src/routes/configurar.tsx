import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Trash2, Upload, ImageIcon, Pencil, Plus } from "lucide-react";
import { TemplateStudioDialog } from "@/components/editor/TemplateStudioDialog";
import { SocialAccountsHub } from "@/components/editor/SocialAccountsHub";
import { Header } from "@/components/editor/Header";
import { InstagramConnect } from "@/components/editor/InstagramConnect";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/lib/editor/store";
import {
  getAllTemplates,
  deleteCustomTemplate,
  getFavoriteTemplateId,
  setFavoriteTemplateId,
  type VideoTemplate,
} from "@/lib/editor/templates";

export const Route = createFileRoute("/configurar")({
  head: () => ({
    meta: [
      { title: "Configurar — LabRemix" },
      { name: "description", content: "Gerencie suas contas do Instagram, templates padrão e logos no LabRemix." },
      { property: "og:title", content: "Configurar — LabRemix" },
      { property: "og:description", content: "Contas, templates e logos em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 pb-24">
        <div>
          <h1 className="text-xl font-semibold">Configurar</h1>
          <p className="text-xs text-muted-foreground">Contas, templates e logos usados no seu trabalho.</p>
        </div>
        <SocialAccountsHub instagram={<InstagramConnect />} />
        <TemplatesSection />
        <LogosSection />
      </main>
    </div>
  );
}

function TemplatesSection() {
  const [list, setList] = useState<VideoTemplate[]>([]);
  const [fav, setFav] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [editing, setEditing] = useState<VideoTemplate | null>(null);
  const refresh = () => { setList(getAllTemplates()); setFav(getFavoriteTemplateId()); };
  useEffect(refresh, []);
  const openStudio = (t: VideoTemplate | null) => { setEditing(t); setStudioOpen(true); };
  const toggle = (id: string) => {
    const next = fav === id ? null : id;
    setFavoriteTemplateId(next);
    setFav(next);
    toast.success(next ? "Template padrão definido" : "Template padrão removido");
  };
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Templates</h2>
          <p className="text-[11px] text-muted-foreground">
            A estrela define o template padrão, aplicado em cada lote novo. O lápis abre o editor do template.
          </p>
        </div>
        <Button size="sm" onClick={() => openStudio(null)}><Plus className="h-4 w-4" /> Novo template</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {list.map((t) => (
          <div key={t.id} className={`rounded-lg border p-2 ${fav === t.id ? "border-primary" : "border-border"}`}>
            <div className="mx-auto mb-2 flex aspect-[9/16] w-16 flex-col overflow-hidden rounded" style={{ background: t.borders.color }}>
              <div style={{ height: `${t.borders.borderTop}%` }} />
              <div className="flex-1 bg-muted" style={{ marginLeft: `${t.borders.borderLeft}%`, marginRight: `${t.borders.borderRight}%` }} />
              <div style={{ height: `${t.borders.borderBottom}%` }} />
            </div>
            <div className="truncate text-xs font-medium">{t.name}</div>
            <div className="mt-1 flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Definir como padrão" onClick={() => toggle(t.id)}>
                <Star className={`h-4 w-4 ${fav === t.id ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar template" onClick={() => openStudio(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {t.isCustom && (
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" aria-label="Excluir" onClick={() => { setList([...deleteCustomTemplate(t.id), ...getAllTemplates().filter((x) => !x.isCustom)]); setFav(getFavoriteTemplateId()); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <TemplateStudioDialog open={studioOpen} onClose={() => { setStudioOpen(false); refresh(); }} templateToEdit={editing} onSaved={refresh} />
    </section>
  );
}

function LogosSection() {
  const presets = useEditor((s) => s.overlayPresets);
  const hydrate = useEditor((s) => s.hydratePresets);
  const add = useEditor((s) => s.addOverlayPreset);
  const remove = useEditor((s) => s.removeOverlayPreset);
  useEffect(() => hydrate(), [hydrate]);
  const onFile = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Envie uma imagem (PNG de preferência)");
    const r = new FileReader();
    r.onload = () => { add(f.name.replace(/\.[^.]+$/, ""), String(r.result)); toast.success("Logo salva"); };
    r.readAsDataURL(f);
  };
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Logos e marcas d'água</h2>
          <p className="text-[11px] text-muted-foreground">Ficam disponíveis em Camadas, no editor de template.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Upload className="h-4 w-4" /> Enviar logo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {presets.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" /> Nenhuma logo salva.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {presets.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-2">
              <img src={p.src} alt={p.name} className="mx-auto h-16 object-contain" />
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="truncate text-[11px]">{p.name}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" aria-label="Excluir logo" onClick={() => remove(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
