import assert from 'node:assert/strict';

export async function contract(request, pid) {
  const path = `/api/products/${pid}`;
  const initial = { pid, pname: '  Test product  ', price: 12.34, quantity: 2 };
  const saved = { ...initial, pname: 'Test product' };
  const expect = async (method, url, body, status) => {
    const response = await request(method, url, body);
    assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(response.body)}`);
    return response.body;
  };
  assert.equal((await expect('GET', '/api/health', undefined, 200)).database, 'up');
  await expect('GET', path, undefined, 404);
  await expect('PUT', path, { pname: 'Missing', price: 1, quantity: 0 }, 404);
  await expect('DELETE', path, undefined, 404);
  let created = false;
  try {
    const result = await expect('POST', '/api/products', initial, 201);
    created = true;
    assert.deepEqual(result, saved);
    await expect('POST', '/api/products', initial, 409);
    assert.deepEqual(await expect('GET', path, undefined, 200), saved);
    assert.ok((await expect('GET', '/api/products', undefined, 200)).some(p => p.pid === pid));
    const invalid = [
      {}, [], null,
      { ...initial, pid: '1' }, { ...initial, pid: 0 }, { ...initial, pid: 1.5 },
      { ...initial, pname: '  ' }, { ...initial, pname: 7 },
      { ...initial, price: '12' }, { ...initial, price: 0 }, { ...initial, price: -1 },
      { ...initial, price: 1.001 }, { ...initial, quantity: -1 },
      { ...initial, quantity: 0.5 }, { ...initial, quantity: '1' },
      { ...initial, extra: true }
    ];
    for (const field of Object.keys(initial)) {
      const body = { ...initial }; delete body[field]; invalid.push(body);
    }
    for (const body of invalid) await expect('POST', '/api/products', body, 400);
    for (const body of [{ pname: 'Partial' }, { pname: 'Bad', price: -1, quantity: 1 },
      { pid, pname: 'Changed', price: 1, quantity: 1 }, { pname: 'Bad', price: 1, quantity: 0.1 }]) {
      await expect('PUT', path, body, 400);
      assert.deepEqual(await expect('GET', path, undefined, 200), saved);
    }
    for (const id of ['0', '-1', '1.5', 'abc', '9007199254740992', '01']) {
      for (const method of ['GET', 'PUT', 'DELETE']) await expect(method, `/api/products/${id}`, undefined, 400);
    }
    const update = { pname: 'Updated', price: 0.29, quantity: 0 };
    assert.deepEqual(await expect('PUT', path, update, 200), { pid, ...update });
    await expect('DELETE', path, undefined, 204);
    await expect('GET', path, undefined, 404);
  } finally {
    // Only this test's exact pid; never delete a database or collection.
    if (created) await request('DELETE', path);
  }
}
