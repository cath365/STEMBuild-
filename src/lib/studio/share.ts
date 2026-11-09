// Share a Maker Studio build as a URL fragment: JSON → deflate → base64url. Nothing is stored on
// a server, and the fragment (#…) is never sent to it.
export const SHARE_PREFIX = "#build=";
export const MAX_SHARE_CHARS = 60_000;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeBuild(doc: unknown) {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(doc)), new CompressionStream("deflate-raw")));
}

/** Returns the parsed JSON, or null for anything that is not a valid compressed build. */
export async function decodeBuild(encoded: string): Promise<unknown> {
  if (!encoded || encoded.length > MAX_SHARE_CHARS || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
    if (bytes.length > 500_000) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
