const url = `${process.env.BASE_URL || 'http://127.0.0.1:3000'}/api/health`;
let healthy = false;
for (let i = 0; i < Number(process.env.HEALTH_ATTEMPTS || 1); i++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const body = await response.json();
    if (response.status === 200 && body.status === 'ok' && body.database === 'up') { healthy = true; break; }
  } catch { /* bounded retry */ }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!healthy) { console.error('API health check failed'); process.exitCode = 1; }
else console.log('API and MongoDB healthy');
