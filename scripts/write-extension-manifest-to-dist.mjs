import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const manifestJsonPath = resolve(workspaceRoot, 'src', 'manifest.json');
const distRoot = resolve(workspaceRoot, 'dist', 'mosaic-board');

const manifestJsonRaw = await readFile(manifestJsonPath, 'utf8');
const manifestJson = JSON.parse(manifestJsonRaw);
const prettyJson = `${JSON.stringify(manifestJson, null, 2)}\n`;

await mkdir(distRoot, { recursive: true });
await writeFile(resolve(distRoot, 'manifest.json'), prettyJson, 'utf8');

console.log('Wrote dist/mosaic-board/manifest.json');
