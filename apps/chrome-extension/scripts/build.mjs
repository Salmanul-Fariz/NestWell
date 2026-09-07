import { cp, mkdir, readFile, watch, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src');
const output = resolve(root, 'dist');
const backendEnv = resolve(root, '../backend/.env');

async function readApiBase() {
  try {
    const env = await readFile(backendEnv, 'utf8');
    const match = env.match(/^NESTWELL_API_BASE_URL\s*=\s*(.+)\s*$/m);
    return (match?.[1] || 'http://localhost:3000/api/v1').replace(/^['"]|['"]$/g, '').replace(/\/$/, '');
  } catch {
    return 'http://localhost:3000/api/v1';
  }
}

async function build() {
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  await writeFile(
    resolve(output, 'config.js'),
    `export const API_BASE_URL = ${JSON.stringify(await readApiBase())};\n`,
  );
  console.log(`Built Chrome extension at ${output}`);
}

await build();

if (process.argv.includes('--watch')) {
  console.log('Watching extension source files...');
  let pending = false;
  for await (const _event of watch(source, { recursive: true })) {
    if (pending) continue;
    pending = true;
    setTimeout(async () => {
      pending = false;
      await build();
    }, 100);
  }
}
