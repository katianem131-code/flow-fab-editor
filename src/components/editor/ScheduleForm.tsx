import { useEffect, useState } from "react";
import { CalendarClock, Zap, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSchedule, FORMAT_LABEL, type PostFormat } from "@/lib/editor/schedule";

const field =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none";

function defaultDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function ScheduleForm({
  videoName,
  headline,
  previewUrl,
  onDone,
}: {
  videoName: string;
  headline: string;
  previewUrl?: string;
  onDone: () => void;
}) {
  const { accounts, addAccount, addPost, hydrate } = useSchedule();
  useEffect(() => hydrate(), [hydrate]);
  const init = defaultDateTime();
  const [selected, setSelected] = useState<string[]>([]);
  const [newAcc, setNewAcc] = useState("");
  const [format, setFormat] = useState<PostFormat>("reels");
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [caption, setCaption] = useState("");
  const [cover, setCover] = useState(1);

  const toggle = (a: string) =>
    setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  const submit = (now: boolean) => {
    if (selected.length === 0) return toast.error("Escolha ao menos uma conta.");
    const publishAt = now ? new Date() : new Date(`${date}T${time}`);
    if (!now && publishAt < new Date()) return toast.error("Escolha um horário futuro.");
    addPost({
      videoName,
      headline,
      caption,
      accounts: selected,
      format,
      publishAt: publishAt.toISOString(),
      coverSecond: cover,
      status: now ? "publishing" : "scheduled",
    });
    toast.success(now ? "Enviado para publicação." : "Post agendado!");
    onDone();
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-3">
      <div>
        <p className="mb-1 text-[11px] text-muted-foreground">Publicar em (uma ou mais)</p>
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                selected.includes(a)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              value={newAcc}
              onChange={(e) => setNewAcc(e.target.value)}
              placeholder="@conta"
              className="w-24 rounded-full border border-border bg-background px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              aria-label="Adicionar conta"
              onClick={() => {
                addAccount(newAcc);
                setNewAcc("");
              }}
              className="grid h-6 w-6 place-items-center rounded-full border border-border text-primary"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      <label className="block text-[11px] text-muted-foreground">
        Formato
        <select className={field} value={format} onChange={(e) => setFormat(e.target.value as PostFormat)}>
          {(Object.keys(FORMAT_LABEL) as PostFormat[]).map((f) => (
            <option key={f} value={f}>{FORMAT_LABEL[f]}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <label className="block text-[11px] text-muted-foreground">
          Dia
          <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block text-[11px] text-muted-foreground">
          Hora
          <input type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="block text-[11px] text-muted-foreground">
        Legenda
        <textarea
          rows={3}
          className={field}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva a legenda do post"
        />
      </label>
      <button
        type="button"
        onClick={() => setCaption((c) => c || `${headline}\n\n#reels #viral`)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
      >
        <Sparkles className="h-3 w-3" /> Sugerir legenda a partir do título
      </button>
      <div className="flex items-end gap-2">
        <label className="block flex-1 text-[11px] text-muted-foreground">
          Capa do Reel (segundo)
          <input
            type="number"
            min={0}
            step={0.5}
            className={field}
            value={cover}
            onChange={(e) => setCover(Number(e.target.value))}
          />
        </label>
        {previewUrl && (
          <video
            src={`${previewUrl}#t=${cover}`}
            muted
            className="h-14 w-8 rounded border border-border object-cover"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90"
        >
          <CalendarClock className="h-3 w-3" /> Confirmar
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Zap className="h-3 w-3" /> Publicar agora
        </button>
        <button type="button" onClick={onDone} className="px-2 text-xs text-muted-foreground">
          Cancelar
        </button>
      </div>
    </div>
  );
}
