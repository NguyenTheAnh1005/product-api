import { test } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { validateProduct, validPrice } from '../src/validation.js';
import { contract } from './contract.js';

function fixture() {
  const records = new Map();
  let healthy = true;
  const repository = {
    async create(p) { if (records.has(p.pid)) throw { code: 11000 }; records.set(p.pid, p); return p; },
    async list() { return [...records.values()]; },
    async get(pid) { return records.get(pid); },
    async update(pid, p) { if (!records.has(pid)) return null; const next = { pid, ...p }; records.set(pid, next); return next; },
    async remove(pid) { const p = records.get(pid); records.delete(pid); return p; }
  };
  return { repository, down() { healthy = false; }, up() { healthy = true; },
    ping: async () => { if (!healthy) throw new Error('secret connection string'); } };
}
test('Full API contract with independent repository', async () => {
  const api = supertest(createApp(fixture()));
  await contract(async (method, path, body) => {
    const req = api[method.toLowerCase()](path);
    return body === undefined ? req : req.send(body);
  }, 1001);
});
test('Health 200 -> 503 -> 200, unavailable CRUD and safe errors', async () => {
  const db = fixture(); const api = supertest(createApp(db));
  await api.get('/api/health').expect(200);
  db.down();
  assert.deepEqual((await api.get('/api/health').expect(503)).body, { status: 'unavailable', database: 'down' });
  await api.get('/api/products').expect(503);
  db.up(); await api.get('/api/health').expect(200);
  db.repository.list = async () => { throw new Error('secret'); };
  assert.deepEqual((await api.get('/api/products').expect(500)).body, { error: 'Internal server error' });
});
test('Malformed JSON, unknown route and body limit', async () => {
  const api = supertest(createApp(fixture()));
  await api.post('/api/products').set('Content-Type', 'application/json').send('{').expect(400);
  await api.post('/api/products').send({ pname: 'x'.repeat(17000) }).expect(413);
  await api.get('/missing').expect(404);
});
test('Numeric boundary validation without JSON coercion', () => {
  for (const price of [NaN, Infinity, -Infinity, 1.001, 1e-10, 1.0000000001, 0, -1, Number.MAX_SAFE_INTEGER]) assert.equal(validPrice(price), false);
  for (const price of [0.01, 0.29, 12.34]) assert.equal(validPrice(price), true);
  for (const quantity of [NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateProduct({ pid: 1, pname: 'a', price: 1, quantity }));
  }
});
