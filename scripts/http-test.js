import { randomInt } from 'node:crypto';
import { contract } from '../test/contract.js';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
await contract(async (method, path, body) => {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)
  });
  return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
}, randomInt(4000000000, 8000000000));
console.log('HTTP contract passed against running API');
