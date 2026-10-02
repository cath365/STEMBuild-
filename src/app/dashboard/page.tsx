import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
export default async function Dashboard(){const user=await requireUser();redirect(`/dashboard/${user.role.toLowerCase()}`)}
