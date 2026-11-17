import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Zap, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useSchedule,
  FORMAT_LABEL,
  defaultFormatForMedia,
  statusForFormat,
  type PostFormat,
} from "@/lib/editor/schedule";
import { cloudUploadPostAssets, cloudUploadPostVideo } from "@/lib/cloud/sync";
import { supabase } from "@/integrations/supabase/client";
import type { BatchAssetInput } from "@/lib/editor/media";

const field =
  "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none";

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
  mediaAssets,
  initialCaption = "",
  onDone,
}: {
  videoName: string;
  headline: string;
  previewUrl?: string;
  mediaAssets?: BatchAssetInput[];
  initialCaption?: string;
  onDone: () => void;
}) {
  const { accounts, addAccount, addPost, hydrate } = useSchedule();
  useEffect(() => hydrate(), [hydrate]);
  const init = defaultDateTime();
  const [selected, setSelected] = useState<string[]>([]);
  const [newAcc, setNewAcc] = useState("");
  const initialFormat = mediaAssets?.length ? defaultFormatForMedia(mediaAssets.map((asset) => asset.kind)) : "reels";
  const [format, setFormat] = useState<PostFormat>(initialFormat);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [caption, setCaption] = useState(initialCaption);
  const [cover, setCover] = useState(1);
  const [busy, setBusy] = useState(false);
  const [igAccounts, setIgAccounts] = useState<{ id: string; username: string | null }[]>([]);
  useEffect(() => {
    supabase.from("instagram_accounts").select("id,username").then(({ data }) => setIgAccounts(data ?? []));
  }, []);
  const allAccounts = [...new Set([...igAccounts.map((a) => `@${a.username}`), ...accounts])];
  const isDraft = format === "image" || format === "carousel";
  const formats: PostFormat[] = mediaAssets?.length
    ? mediaAssets.length > 1
      ? ["carousel"]
      : mediaAssets[0].kind === "image"
        ? ["image"]
        : ["reels", "feed", "stories"]
    : ["reels", "feed", "stories"];

  const previews = useMemo(
    () => (mediaAssets ?? []).map((asset) => ({ id: asset.id, kind: asset.kind, url: URL.createObjectURL(asset.file) })),
    [mediaAssets],
  );
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const toggle = (a: string) =>
    setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  const submit = async (now: boolean) => {
    if (selected.length === 0) return toast.error("Escolha ao menos uma conta.");
    const targets = igAccounts.filter((a) => selected.includes(`@${a.username}`));
    if (targets.length !== selected.length) return toast.error("Conecte todas as contas escolhidas ao Instagram primeiro.");
    const publishAt = now ? new Date() : new Date(`${date}T${time}`);
    if (!now && publishAt < new Date()) return toast.error("Escolha um horário futuro.");
    setBusy(true);
    let videoPath: string | null = null;
    let mediaPaths: string[] | undefined;
    if (mediaAssets?.length) {
      mediaPaths = (await cloudUploadPostAssets(mediaAssets)) ?? undefined;
      if (mediaAssets.length === 1 && mediaAssets[0].kind === "video") videoPath = mediaPaths?.[0] ?? null;
    } else {
      videoPath = previewUrl ? await cloudUploadPostVideo(previewUrl, videoName) : null;
    }
    setBusy(false);
    if (!videoPath && !mediaPaths?.length) {
      return toast.error("Entre na sua conta e aguarde o envio da mídia para salvar na agenda.");
    }
    addPost({
      videoPath: videoPath ?? undefined,
      mediaPaths,
      mediaTypes: mediaAssets?.map((asset) => asset.kind),
      videoName,
      headline,
      caption,
      accounts: selected,
      accountIds: targets.map((a) => a.id),
      format,
      publishAt: publishAt.toISOString(),
      coverSecond: cover,
      status: statusForFormat(format, now),
    });
    toast.success(
      isDraft
        ? "Rascunho salvo na agenda. A publicação automática deste formato ainda não está habilitada."
        : now
          ? "Enviado para publicação."
          : "Post agendado!",
    );
    onDone();
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-3">
      <div>
        <p className="mb-1 text-[11px] text-muted-foreground">Publicar em (uma ou mais)</p>
        <div className="flex flex-wrap gap-1.5">
          {allAccounts.map((a) => (
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
          {formats.map((f) => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
        </select>
      </label>
      {isDraft && (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-muted-foreground">
          Este rascunho guarda data, legenda, contas e slides para você modelar a publicação. Ele não será enviado automaticamente ao Instagram.
        </p>
      )}
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
          rows={4}
          className={field}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva ou modele a legenda do post"
        />
      </label>
      <button
        type="button"
        onClick={() => setCaption((c) => c || `${headline}\n\n#reels #viral`)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
      >
        <Sparkles className="h-3 w-3" /> Sugerir legenda a partir do título
      </button>
      {!isDraft && (
        <div className="flex items-end gap-2">
          <label className="block flex-1 text-[11px] text-muted-foreground">
            Capa do Reel (segundo)
            <input type="number" min={0} step={0.5} className={field} value={cover} onChange={(e) => setCover(Number(e.target.value))} />
          </label>
          {previewUrl && <video src={`${previewUrl}#t=${cover}`} muted className="h-14 w-8 rounded border border-border object-cover" />}
        </div>
      )}
      {previews.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {previews.map((preview, index) => (
            <div key={preview.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-background">
              {preview.kind === "image" ? (
                <img src={preview.url} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
              ) : (
                <video src={preview.url} muted className="h-full w-full object-cover" />
              )}
              <span className="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 text-[9px]">{index + 1}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false)}
          className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60"
        >
          <CalendarClock className="h-3 w-3" /> {busy ? "Enviando mídia…" : isDraft ? "Salvar rascunho na agenda" : "Confirmar"}
        </button>
        {!isDraft && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(true)}
            className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
          >
            <Zap className="h-3 w-3" /> Publicar agora
          </button>
        )}
        <button type="button" onClick={onDone} className="px-2 text-xs text-muted-foreground">Cancelar</button>
      </div>
    </div>
  );
}
