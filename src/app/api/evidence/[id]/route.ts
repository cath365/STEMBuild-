import { readEvidence } from "@/lib/evidence-storage";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const asset = await db.evidenceAsset.findUnique({
    where: { id },
    include: {
      practicalSubmission: { include: { classroom: true } },
      projectSubmission: { include: { classroom: true } },
    },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  const ownsPractical = asset.practicalSubmission?.studentId === user.id;
  const teachesPractical = user.role === "TEACHER" && asset.practicalSubmission?.classroom?.teacherId === user.id;
  const ownsProject = asset.projectSubmission?.studentId === user.id;
  const teachesProject = user.role === "TEACHER" && asset.projectSubmission?.classroom.teacherId === user.id;
  const allowed = user.role === "ADMIN" || ownsPractical || teachesPractical || ownsProject || teachesProject;
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const result = await readEvidence(asset.storagePath);
  if (!result) return new Response("File not found", { status: 404 });
  return new Response(result.body, {
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${(asset.originalName || "evidence").replace(/[\"\r\n\\]/g, "")}"`,
    },
  });
}
