import { test } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomInt } from 'node:crypto';
import { createDatabase } from '../src/database.js';
import { createApp } from '../src/app.js';
import { contract } from './contract.js';

test('Real MongoDB: CRUD, unique index, outage, recovery and persisted record', { timeout: 1200000 }, async () => {
  let mongo, db;
  const pid = randomInt(1000000000, 2000000000);
  const racePid = pid + 2000000000;
  try {
    if (!process.env.TEST_MONGODB_URI) mongo = await MongoMemoryServer.create({ binary: { version: '8.0.17' } });
    db = createDatabase(process.env.TEST_MONGODB_URI || mongo.getUri('product_api_test'));
    await db.init();
    const api = supertest(createApp(db));
    await contract(async (method, path, body) => {
      const req = api[method.toLowerCase()](path);
      return body === undefined ? req : req.send(body);
    }, pid);
    const indexes = await db.Product.collection.indexes();
    assert.ok(indexes.some(i => i.key.pid === 1 && i.unique));
    const data = { pid: racePid, pname: 'Race test', price: 1, quantity: 1 };
    const results = await Promise.all([api.post('/api/products').send(data), api.post('/api/products').send(data)]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    if (mongo) {
      // Windows terminates child processes without Unix SIGINT semantics.
      // Flush acknowledged test writes before deliberately stopping mongod.
      await db.connection.db.admin().command({ fsync: 1 });
      await mongo.stop({ doCleanup: false });
      await api.get('/api/health').expect(503);
      await mongo.start(true);
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        if ((await api.get('/api/health')).status === 200) { ready = true; break; }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      assert.ok(ready, 'MongoDB must reconnect after restart');
      assert.equal((await api.get(`/api/products/${racePid}`).expect(200)).body.pname, data.pname);
    } else {
      console.log('External MongoDB: outage/restart checks are covered separately by test:docker; no external DB stop attempted.');
    }
  } finally {
    if (db) {
      if (db.connection.readyState === 1) await db.Product.deleteMany({ pid: { $in: [pid, racePid] } });
      await db.close();
    }
    if (mongo) await mongo.stop();
  }
});
