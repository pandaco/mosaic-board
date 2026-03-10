import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const packageJsonPath = resolve(workspaceRoot, 'package.json');
const manifestJsonPath = resolve(workspaceRoot, 'public', 'manifest.json');
const versionTsPath = resolve(workspaceRoot, 'src', 'app', 'version.ts');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const { version } = packageJson;

// Sync manifest.json
const manifestJson = JSON.parse(await readFile(manifestJsonPath, 'utf8'));
manifestJson.version = version;
await writeFile(manifestJsonPath, `${JSON.stringify(manifestJson, null, 2)}\n`, 'utf8');
console.log(`Synced public/manifest.json version to ${version}`);

// Sync src/app/version.ts
const versionTsContent = `export const APP_VERSION = '${version}';\n`;
await writeFile(versionTsPath, versionTsContent, 'utf8');
console.log(`Synced src/app/version.ts to ${version}`);
