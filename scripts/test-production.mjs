// Exercise the production server, not Next.js's development server.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const port = process.env.TEST_PORT || '4174';
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', port], {stdio:['ignore','pipe','pipe']});
server.stderr.on('data', data => process.stderr.write(data));
try {
  await new Promise((resolve,reject) => {
    server.stdout.on('data', data => { if (String(data).includes('Ready')) resolve(); });
    server.once('exit', code => reject(new Error(`Server exited: ${code}`)));
    setTimeout(() => reject(new Error('Server startup timed out')), 15000).unref();
  });
  const test = spawn(process.execPath, ['scripts/test-api.mjs'], {stdio:'inherit',env:{...process.env,TEST_BASE_URL:`http://127.0.0.1:${port}`}});
  const [code] = await once(test, 'exit');
  if (code) process.exitCode = code;
} finally { server.kill('SIGTERM'); }
