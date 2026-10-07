import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { del, get, put } from "@vercel/blob";

// Explicit development-only storage. Vercel production always uses private Blob.
function localEnabled() {
  if (process.env.EVIDENCE_STORAGE !== "local") return false;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new Error("Local evidence storage is development-only.");
  return true;
}
const directory = resolve(process.cwd(), ".local-evidence");
function localPath(path: string) {
  const id = path.slice("local:".length);
  if (!/^[-a-f0-9]{36}$/.test(id)) throw new Error("Invalid evidence path.");
  return resolve(directory, id);
}

export async function storeEvidence(pathname: string, file: File) {
  if (!localEnabled()) return put(pathname, file, { access: "private" });
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const pathnameLocal = `local:${randomUUID()}`;
  await writeFile(localPath(pathnameLocal), Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
  return { pathname: pathnameLocal };
}

export async function deleteEvidence(path: string) {
  if (path.startsWith("local:")) {
    if (!localEnabled()) throw new Error("Local evidence unavailable.");
    await unlink(localPath(path)).catch(() => undefined);
  } else await del(path);
}

export async function readEvidence(path: string) {
  if (path.startsWith("local:")) {
    if (!localEnabled()) return null;
    try { return { body: new Uint8Array(await readFile(localPath(path))) as BodyInit }; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  const result = await get(path, { access: "private", useCache: false });
  return result ? { body: result.stream } : null;
}
