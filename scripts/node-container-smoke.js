import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Uses .env to connect a local Node process to nammongodb through loopback.
const env = { ...process.env, PORT: '3001', BASE_URL: 'http://127.0.0.1:3001', HEALTH_ATTEMPTS: '30' };
const server = spawn(process.execPath, ['--env-file=.env', 'src/server.js'], { env, stdio: 'inherit' });
async function run(file) {
  const child = spawn(process.execPath, [file], { env, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(`${file} failed (${code})`);
}
try {
  await run('scripts/health.js');
  await run('scripts/http-test.js');
  console.log('Node -> nammongodb: .env connection and HTTP contract passed');
} finally {
  if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
}
