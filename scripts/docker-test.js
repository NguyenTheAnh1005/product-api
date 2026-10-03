import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
// Explicitly invoked only: temporarily stops MongoDB in this Compose stack.
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.yaml';
const compose = (...args) => execFileSync('docker', ['compose', '-f', composeFile, ...args], { stdio: 'inherit' });
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const pid = randomInt(8000000000, 9000000000);
async function health(status) {
  for (let i = 0; i < 45; i++) {
    try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) })).status === status) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.fail(`Expected health ${status}`);
}
await health(200);
execFileSync(process.execPath, ['scripts/http-test.js'], { stdio: 'inherit' });
let created = false;
try {
  const response = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid, pname: 'Volume persistence test', price: 1, quantity: 0 }) });
  assert.equal(response.status, 201); created = true;
  compose('stop', 'mongo');
  await health(503);
  compose('start', 'mongo');
  await health(200);
  compose('restart', 'api', 'mongo');
  await health(200);
  let saved = await fetch(`${base}/api/products/${pid}`);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).pname, 'Volume persistence test');
  // Recreate containers without removing their named volume.
  compose('up', '-d', '--force-recreate', '--wait', '--wait-timeout', '120');
  await health(200);
  saved = await fetch(`${base}/api/products/${pid}`);
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).pid, pid);
  console.log('Compose: outage, recovery, restart and named-volume persistence passed');
} finally {
  compose('start', 'mongo');
  await health(200);
  if (created) assert.equal((await fetch(`${base}/api/products/${pid}`, { method: 'DELETE' })).status, 204);
}
