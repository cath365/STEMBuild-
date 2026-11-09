import { db } from "@/lib/db";

/** True until the first administrator exists. After that, /setup is closed for good. */
export async function setupIsOpen() {
  return (await db.user.count({ where: { role: "ADMIN" } })) === 0;
}
