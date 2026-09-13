// Run standard Next.js development; normalize flags from Vite-style preview hosts.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const production = process.argv.includes('--production');
const args = process.argv.slice(2).filter(arg => arg !== '--strictPort' && arg !== '--production')
  .map(arg => arg === '--host' ? '--hostname' : arg);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), production ? 'start' : 'dev', ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
