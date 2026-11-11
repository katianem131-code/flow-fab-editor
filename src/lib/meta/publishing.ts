export type Phase = "pending" | "creating" | "processing" | "ready" | "sending" | "unknown" | "published" | "failed";
export interface Destination { id: string; account_id: string; user_id: string; phase: Phase; container_id: string | null; media_id: string | null; attempts: number; operation_started_at: string | null }
export interface Patch { phase: Phase; container_id?: string; media_id?: string; error_code?: string; next_attempt_at?: string }
export function ownsPath(user: string, path: string) {
  return path.startsWith(`${user}/`) && !path.split("/").some((p) => p === ".." || p === "." || p === "") && !path.includes("\\");
}
export function backoff(attempts: number, minimum = 60) { return Math.min(3600, Math.max(minimum, 60 * 2 ** Math.min(attempts, 6))); }
export interface PublishingIO {
  save: (expected: Phase, patch: Patch) => Promise<boolean>;
  create: () => Promise<string>;
  status: (container: string) => Promise<string>;
  publish: (container: string) => Promise<string>;
}
export async function stepDestination(d: Destination, io: PublishingIO, now = Date.now()) {
  const later = (seconds: number) => new Date(now + seconds * 1000).toISOString();
  if (d.phase === "published" || d.phase === "failed") return;
  if (d.phase === "creating" || d.phase === "sending") {
    await io.save(d.phase, { phase: "unknown", error_code: "interrupted_write" }); return;
  }
  try {
    if (d.phase === "pending") {
      if (!await io.save("pending", { phase: "creating" })) return;
      d = { ...d, phase: "creating" };
      const id = await io.create();
      if (!id) throw { ambiguous: true };
      await io.save("creating", { phase: "processing", container_id: id, next_attempt_at: later(60) });
    } else if ((d.phase === "processing" || d.phase === "unknown") && d.container_id) {
      const status = await io.status(d.container_id);
      if (status === "PUBLISHED") await io.save(d.phase, { phase: "published", error_code: d.media_id ? undefined : "published_id_unresolved" });
      else if (status === "ERROR" || status === "EXPIRED") await io.save(d.phase, { phase: "failed", error_code: `container_${status.toLowerCase()}` });
      else if (status === "FINISHED" && d.phase !== "unknown") await io.save(d.phase, { phase: "ready", next_attempt_at: later(60) });
      else if (d.phase === "processing" && d.attempts >= 6) await io.save(d.phase, { phase: "failed", error_code: "processing_timeout" });
      else await io.save(d.phase, { phase: d.phase, error_code: d.phase === "unknown" ? "publication_unconfirmed" : undefined, next_attempt_at: later(backoff(d.attempts)) });
    } else if (d.phase === "ready" && d.container_id) {
      const container = d.container_id;
      if (!await io.save("ready", { phase: "sending" })) return;
      d = { ...d, phase: "sending" };
      const id = await io.publish(container);
      if (!id) throw { ambiguous: true };
      await io.save("sending", { phase: "published", media_id: id });
    }
  } catch (error) {
    const e = error as { code?: string; recoverable?: boolean; ambiguous?: boolean; retryAfter?: number };
    const writing = d.phase === "creating" || d.phase === "sending";
    // Any interrupted publish is uncertain, even if the provider returned an error after accepting it.
    const uncertain = writing && (e.ambiguous !== false || d.phase === "sending");
    await io.save(d.phase, { phase: uncertain ? "unknown" : e.recoverable && d.attempts < 8 ? (d.phase === "creating" ? "pending" : d.phase) : "failed",
      error_code: e.code ?? "ambiguous_response", next_attempt_at: later(backoff(d.attempts, e.retryAfter)) });
  }
}