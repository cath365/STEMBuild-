import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync, createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';

const database = await PGlite.create();
await database.exec(readFileSync('prisma/migrations/20261007060000_initial_stembuild/migration.sql', 'utf8'));
const socket = new PGLiteSocketServer({ db: database, host: '127.0.0.1', port: 5433, maxConnections: 30 });
await socket.start();
const env = { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5433/postgres', EVIDENCE_STORAGE: 'local', AI_GATEWAY_API_KEY: '', AI_COACH_DISABLE_MODEL: 'true' };
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
  });
}
let app;
try {
  await run('npm', ['run', 'db:seed']);
  app = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000'], { env, stdio: ['ignore','pipe','pipe'], detached: true });
  const log = createWriteStream('/tmp/stembuild-app.log');
  app.stdout.pipe(log); app.stderr.pipe(log);
  const start = Date.now();
  while (true) {
    try { if ((await fetch('http://127.0.0.1:3000/login')).ok) break; } catch {}
    if (app.exitCode !== null) throw new Error('Development server exited; check /tmp/stembuild-app.log');
    if (Date.now() - start > 60000) throw new Error('Development server did not start; check /tmp/stembuild-app.log');
    await new Promise((r) => setTimeout(r, 500));
  }
  await run('npx', ['playwright', 'test']);
} finally {
  if (app?.pid) { try { process.kill(-app.pid, 'SIGTERM'); } catch {} }
  await socket.stop(); await database.close();
}
