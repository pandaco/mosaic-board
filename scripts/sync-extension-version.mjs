import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const packageJsonPath = resolve(workspaceRoot, 'package.json');
const manifestJsonPath = resolve(workspaceRoot, 'public', 'manifest.json');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const manifestJson = JSON.parse(await readFile(manifestJsonPath, 'utf8'));

manifestJson.version = packageJson.version;

await writeFile(manifestJsonPath, `${JSON.stringify(manifestJson, null, 2)}\n`, 'utf8');
console.log(`Synced public/manifest.json version to ${packageJson.version}`);
