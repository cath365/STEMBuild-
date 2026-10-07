import { readEvidence } from "@/lib/evidence-storage";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await db.componentMedia.findUnique({ where: { id } });
  if (!media) return new Response("Not found", { status: 404 });

  if (!media.verified) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") return new Response("Not found", { status: 404 });
  }

  const result = await readEvidence(media.storagePath);
  if (!result) return new Response("File not found", { status: 404 });

  return new Response(result.body, {
    headers: {
      "Content-Type": media.mimeType || "application/octet-stream",
      "Cache-Control": media.verified ? "public, max-age=3600, stale-while-revalidate=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${(media.originalName || "component-image").replace(/["\r\n\\]/g, "")}"`,
    },
  });
}
