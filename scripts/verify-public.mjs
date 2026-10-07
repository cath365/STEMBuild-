import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
const baseURL = 'http://127.0.0.1:3001';
const env = { ...process.env, CI: '', TEST_BASE_URL: baseURL, TEST_PUBLIC_OFFLINE: 'true' };
const app = spawn('npm', ['run','start','--','--hostname','127.0.0.1','--port','3001'], { env, stdio:['ignore','pipe','pipe'], detached:true });
const log = createWriteStream('/tmp/stembuild-public.log');
app.stdout.pipe(log); app.stderr.pipe(log);
try {
  const started = Date.now();
  while (true) {
    try { if ((await fetch(baseURL)).ok) break; } catch {}
    if (app.exitCode !== null) throw new Error('Public server exited; check /tmp/stembuild-public.log');
    if (Date.now() - started > 60000) throw new Error('Public server did not start; check /tmp/stembuild-public.log');
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  await new Promise((resolve,reject)=>{
    const child=spawn('npx',['playwright','test','tests/e2e/public-showcase.spec.ts'],{env,stdio:'inherit'});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`Public tests exited ${code}`)));
  });
} finally {
  if (app.pid) { try { process.kill(-app.pid,'SIGTERM'); } catch {} }
}
