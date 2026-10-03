import { createApp } from './app.js';
import { createDatabase } from './database.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535 || !process.env.MONGODB_URI) {
  console.error('Valid PORT and MONGODB_URI are required');
  process.exit(1);
}
const db = createDatabase(process.env.MONGODB_URI);
const server = createApp(db).listen(port, '0.0.0.0', () => console.log(`product-api listening on ${port}`));
db.init().then(() => console.log('MongoDB ready; unique pid index ensured')).catch(async () => {
  console.error('Database initialization failed');
  server.close(); await db.close(); process.exitCode = 1;
});
async function shutdown() {
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => { await db.close(); clearTimeout(timer); });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
