import express from 'express';
import { parsePid, validateProduct } from './validation.js';

const present = p => ({ pid: p.pid, pname: p.pname, price: p.price, quantity: p.quantity });
export function createApp({ repository, ping }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const path = req.path;
    res.on('finish', () => console.log(`${req.method} ${path} ${res.statusCode}`));
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', async (_req, res) => {
    try { await ping(); res.json({ status: 'ok', database: 'up' }); }
    catch { res.status(503).json({ status: 'unavailable', database: 'down' }); }
  });
  app.use('/api/products', async (_req, res, next) => {
    try { await ping(); next(); }
    catch { res.status(503).json({ error: 'Database unavailable' }); }
  });
  app.post('/api/products', async (req, res) => {
    const product = await repository.create(validateProduct(req.body));
    res.location(`/api/products/${product.pid}`).status(201).json(present(product));
  });
  app.get('/api/products', async (_req, res) => res.json((await repository.list()).map(present)));
  app.get('/api/products/:pid', async (req, res) => {
    const product = await repository.get(parsePid(req.params.pid));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(present(product));
  });
  app.put('/api/products/:pid', async (req, res) => {
    const pid = parsePid(req.params.pid);
    const product = await repository.update(pid, validateProduct(req.body, false));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(present(product));
  });
  app.delete('/api/products/:pid', async (req, res) => {
    if (!await repository.remove(parsePid(req.params.pid))) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  });
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => {
    if (err.code === 11000) return res.status(409).json({ error: 'pid already exists' });
    if (err.status === 413) return res.status(413).json({ error: 'Request body too large' });
    if (err.status === 400 || err.name === 'ValidationError' || err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid request' });
    }
    console.error('Request failed');
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
