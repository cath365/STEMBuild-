// Creates the first administrator (or promotes an existing account to administrator).
// Admins then invite teachers from /dashboard/admin/users; students join with class codes.
//
//   $env:DATABASE_URL="<production database URL>"
//   $env:ADMIN_EMAIL="you@school.org"; $env:ADMIN_NAME="Your Name"; $env:ADMIN_PASSWORD="a long passphrase"
//   npm run admin:create
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateDisplayName, validateEmail, validateNewPassword } from "../src/lib/account-tokens";
import { hashPassword } from "../src/lib/password";

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL ?? fail("Set DATABASE_URL to the database you want to add the admin to.");
const email = validateEmail(process.env.ADMIN_EMAIL ?? "");
if ("error" in email) fail(`ADMIN_EMAIL: ${email.error}`);
const name = validateDisplayName(process.env.ADMIN_NAME ?? "");
if ("error" in name) fail(`ADMIN_NAME: ${name.error}`);
const password = process.env.ADMIN_PASSWORD ?? "";
const problem = validateNewPassword(password, password, email.value);
if (problem) fail(`ADMIN_PASSWORD: ${problem}`);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email: email.value } });
  const user = await db.user.upsert({
    where: { email: email.value },
    create: { email: email.value, displayName: name.value, passwordHash, role: "ADMIN" },
    update: { displayName: name.value, passwordHash, role: "ADMIN", isActive: true, failedLoginCount: 0, lockedUntil: null },
  });
  if (existing) await db.session.deleteMany({ where: { userId: user.id } });   // old sessions end with the old password
  console.log(`\n✔ ${existing ? "Updated" : "Created"} administrator ${user.email}. Sign in at /login.\n`);
} finally {
  await db.$disconnect();
}
