export function validPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 &&
    value <= Number.MAX_SAFE_INTEGER / 100 &&
    /^\d+(\.\d{1,2})?$/.test(String(value));
}

export function parsePid(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw Object.assign(new Error('pid must be a positive safe integer'), { status: 400 });
  }
  return Number(value);
}

export function validateProduct(body, create = true) {
  const fields = create ? ['pid', 'pname', 'price', 'quantity'] : ['pname', 'price', 'quantity'];
  const fail = () => { throw Object.assign(new Error('Invalid product fields or values'), { status: 400 }); };
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail();
  if (Object.keys(body).length !== fields.length || fields.some(key => !Object.hasOwn(body, key))) fail();
  if (create && (!Number.isSafeInteger(body.pid) || body.pid <= 0)) fail();
  if (typeof body.pname !== 'string' || !body.pname.trim()) fail();
  if (!validPrice(body.price)) fail();
  if (!Number.isSafeInteger(body.quantity) || body.quantity < 0) fail();
  return { ...body, pname: body.pname.trim() };
}
