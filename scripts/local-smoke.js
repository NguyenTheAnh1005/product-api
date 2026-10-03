import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

// Dedicated real MongoDB and actual src/server.js process; never touches demo DB.
const mongo = await MongoMemoryServer.create({ binary: { version: '8.0.17' } });
let server;
async function run(file, env) {
  const child = spawn(process.execPath, [file], { env, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(`${file} failed with ${code}`);
}
try {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const env = { ...process.env, PORT: String(port), BASE_URL: `http://127.0.0.1:${port}`,
    MONGODB_URI: mongo.getUri('product_api_smoke'), HEALTH_ATTEMPTS: '30' };
  server = spawn(process.execPath, ['src/server.js'], { env, stdio: 'inherit' });
  await run('scripts/health.js', env);
  await run('scripts/http-test.js', env);
  console.log('Real server process HTTP smoke passed');
} finally {
  if (server && server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
  await mongo.stop();
}
