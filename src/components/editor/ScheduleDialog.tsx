import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEditor, titleTextForItem } from "@/lib/editor/store";
import { ScheduleForm } from "./ScheduleForm";

export function ScheduleDialog() {
  const items = useEditor((s) => s.items);
  const globalTitle = useEditor((s) => s.globalTitle);
  const ready = items.filter((i) => i.outputUrl);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  if (ready.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary/10">
          <CalendarClock className="h-3 w-3" /> Agendar
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 max-sm:p-4 max-sm:pt-5">
        <DialogHeader>
          <DialogTitle>Agendar publicações</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pb-2">
          {ready.map((it) => {
            const idx = items.findIndex((x) => x.id === it.id);
            const headline = globalTitle.enabled ? titleTextForItem(it, idx, globalTitle) : it.name;
            return (
              <div key={it.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <video src={it.outputUrl} muted className="h-24 w-14 shrink-0 rounded bg-background object-cover sm:h-20 sm:w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{idx + 1}. {it.outputName ?? it.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{headline}</p>
                    <span className="mt-1 inline-block rounded bg-success px-1.5 py-0.5 text-[10px] font-semibold text-success-foreground">
                      {done.includes(it.id) ? "Agendado" : "Pronto"}
                    </span>
                  </div>
                  {openId !== it.id && (
                    <button
                      onClick={() => setOpenId(it.id)}
                      className="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground"
                    >
                      Agendar
                    </button>
                  )}
                </div>
                {openId === it.id && (
                  <div className="mt-3">
                    <ScheduleForm
                      videoName={it.outputName ?? it.name}
                      headline={headline}
                      previewUrl={it.outputUrl}
                      onDone={() => {
                        setDone((d) => [...d, it.id]);
                        setOpenId(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <Link to="/agenda" className="block text-center text-xs font-medium text-primary">
            Ver agenda de posts →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
