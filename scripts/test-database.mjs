import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// A disposable local Postgres engine; production still uses PostgreSQL.
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5433, maxConnections: 30 });
await server.start();
console.log('Disposable test database listening on 127.0.0.1:5433');
async function stop() { await server.stop(); await db.close(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
