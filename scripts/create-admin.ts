// Creates the first administrator (or promotes an existing account to administrator).
// Admins then invite teachers from /dashboard/admin/users; students join with class codes.
//
//   npm run admin:create        (on Windows PowerShell: npm.cmd run admin:create)
//
// It asks for the database address, email, name and password; secrets are not echoed.
import { createInterface, type Interface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateDisplayName, validateEmail, validateNewPassword } from "../src/lib/account-tokens";
import { hashPassword } from "../src/lib/password";

type MutableInterface = Interface & { _writeToOutput: (text: string) => void };

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) }) as MutableInterface;
let hideTyping = false;
let finished = false;
let waiting: ((line: string) => void) | null = null;
const writeOriginal = rl._writeToOutput.bind(rl);
let currentPrompt = "";
// While a secret is typed, show stars; when the terminal redraws the line, keep the question visible.
rl._writeToOutput = (text) => {
  if (!hideTyping) return writeOriginal(text);
  if (/[\r\n]/.test(text)) return writeOriginal("\n");
  if (currentPrompt && text.startsWith(currentPrompt)) return writeOriginal(currentPrompt + "*".repeat(text.length - currentPrompt.length));
  writeOriginal("*".repeat(text.length));
};
function cancel() { console.log("\nCancelled. Nothing was changed."); process.exit(1); }
let closed = false;
rl.on("close", () => { closed = true; if (waiting && !finished) cancel(); });

// Answers are queued line by line, so pasted or piped input is never lost between questions.
const lines: string[] = [];
rl.on("line", (line) => {
  if (waiting) { const resolve = waiting; waiting = null; resolve(line); } else lines.push(line);
});

function ask(question: string, hidden = false) {
  currentPrompt = question;
  rl.setPrompt(question);
  rl.prompt();
  hideTyping = hidden;
  return new Promise<string>((resolve) => {
    const done = (line: string) => { hideTyping = false; resolve(line.trim()); };
    const queued = lines.shift();
    if (queued !== undefined) done(queued); else if (closed) cancel(); else waiting = done;
  });
}

type Checked<T> = { value: T } | { error: string };

async function askUntilValid<T>(question: string, check: (answer: string) => Checked<T>, hidden = false): Promise<T> {
  for (;;) {
    const result = check(await ask(question, hidden));
    if ("value" in result) return result.value;
    console.log(`  ✖ ${result.error}`);
  }
}

function checkDatabaseUrl(answer: string): Checked<{ url: string; host: string }> {
  const value = answer.replace(/^["']|["']$/g, "");
  if (value.startsWith("prisma+postgres://")) return { error: "That is the PRISMA_DATABASE_URL. Paste the DATABASE_URL instead: it starts with postgres://" };
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname.includes(".") && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error();
    return { value: { url: value, host: url.hostname } };
  } catch {
    return { error: "That is not a database address. It should start with postgres:// and contain @ and a host name." };
  }
}

console.log("\nCreate a STEMBuild administrator. Press Ctrl+C at any time to cancel.\n");
const database = await askUntilValid("Database address (DATABASE_URL, starts with postgres://; hidden as you paste): ", checkDatabaseUrl, true);
const email = await askUntilValid<string>("Your email: ", validateEmail);
const name = await askUntilValid<string>("Your name: ", validateDisplayName);
const password = await askUntilValid("Choose a password (12+ characters, hidden): ", (a): Checked<string> => { const problem = validateNewPassword(a, a, email); return problem ? { error: problem } : { value: a }; }, true);
await askUntilValid("Type it again: ", (a): Checked<true> => (a === password ? { value: true } : { error: "The two passwords do not match. Type it again." }), true);
const confirm = await ask(`\nCreate administrator ${email} in the database at ${database.host}? Type yes to continue: `);
if (confirm.toLowerCase() !== "yes") { console.log("Nothing was changed."); finished = true; rl.close(); process.exit(0); }

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.url }) });
try {
  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email } });
  const user = await db.user.upsert({
    where: { email },
    create: { email, displayName: name, passwordHash, role: "ADMIN" },
    update: { displayName: name, passwordHash, role: "ADMIN", isActive: true, failedLoginCount: 0, lockedUntil: null },
  });
  if (existing) await db.session.deleteMany({ where: { userId: user.id } });   // old sessions end with the old password
  console.log(`\n✔ ${existing ? "Updated" : "Created"} administrator ${user.email}. Sign in at /login.\n`);
} catch (error) {
  const code = (error as { code?: string }).code;
  console.error(code === "P1001" ? "\n✖ Could not reach that database. Check the address was copied completely.\n" : `\n✖ ${(error as Error).message}\n`);
  process.exitCode = 1;
} finally {
  finished = true;
  rl.close();
  await db.$disconnect();
}
