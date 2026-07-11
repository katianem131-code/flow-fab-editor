import { zipSync, strToU8 } from "fflate";

export async function zipBlobs(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const e of entries) {
    let name = safeName(e.name);
    let i = 1;
    while (used.has(name)) {
      name = withSuffix(safeName(e.name), i++);
    }
    used.add(name);
    const buf = new Uint8Array(await e.blob.arrayBuffer());
    files[name] = buf;
  }
  files["_LabRemix.txt"] = strToU8("Processado com LabRemix — Remix inteligente. Resultado original.\n");
  const zipped = zipSync(files, { level: 0 });
  const out = new Uint8Array(zipped.byteLength);
  out.set(zipped);
  return new Blob([out], { type: "application/zip" });
}

function safeName(n: string) {
  return n.replace(/[\\/:*?"<>|]/g, "_");
}
function withSuffix(n: string, i: number) {
  const dot = n.lastIndexOf(".");
  if (dot < 0) return `${n} (${i})`;
  return `${n.slice(0, dot)} (${i})${n.slice(dot)}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
