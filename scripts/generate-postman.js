import { writeFileSync } from 'node:fs';
const item = (name, method, path, status, body, checks = []) => ({
  name,
  request: { method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: `{{baseUrl}}${path}`, ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}) },
  event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`, ...checks
  ] } }]
});
const data = { pid: '{{pid}}', pname: 'Postman demo', price: 12.34, quantity: 2 };
const collection = {
  info: { name: 'product-api P1', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000' }, { key: 'pid', value: '9000000001' }],
  item: [
    item('1. Health', 'GET', '/api/health', 200, null, ["pm.test('DB up', () => pm.expect(pm.response.json().database).to.eql('up'));"]),
    item('2. Create', 'POST', '/api/products', 201, data, ["pm.test('Created pid', () => pm.expect(pm.response.json().pid).to.eql(Number(pm.collectionVariables.get('pid'))));"]),
    item('3. Duplicate', 'POST', '/api/products', 409, data),
    item('4. List', 'GET', '/api/products', 200, null, ["pm.test('Contains demo', () => pm.expect(pm.response.json().some(p => p.pid === Number(pm.collectionVariables.get('pid')))).to.eql(true));"]),
    item('5. Detail', 'GET', '/api/products/{{pid}}', 200),
    item('6. Invalid update', 'PUT', '/api/products/{{pid}}', 400, { pname: 'Bad', price: -1, quantity: 0 }),
    item('7. Invalid update preserves data', 'GET', '/api/products/{{pid}}', 200, null, ["pm.test('Unchanged', () => pm.expect(pm.response.json().price).to.eql(12.34));"]),
    item('8. Update', 'PUT', '/api/products/{{pid}}', 200, { pname: 'Updated', price: 20, quantity: 0 }, ["pm.test('Updated', () => pm.expect(pm.response.json().quantity).to.eql(0));"]),
    item('9. Delete test record', 'DELETE', '/api/products/{{pid}}', 204),
    item('10. Missing', 'GET', '/api/products/{{pid}}', 404)
  ]
};
collection.item[1].event.unshift({ listen: 'prerequest', script: { type: 'text/javascript', exec: ["pm.collectionVariables.set('pid', Math.floor(9000000000 + Math.random() * 1000000000));"] } });
// Keep pid as a JSON number after Postman variable substitution.
for (const request of collection.item) if (request.request.body) request.request.body.raw = request.request.body.raw.replace('"{{pid}}"', '{{pid}}');
writeFileSync('postman/product-api.postman_collection.json', JSON.stringify(collection, null, 2) + '\n');
