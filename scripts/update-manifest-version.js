#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function updateManifestVersion() {
  const pkgPath = resolve(__dirname, '..', 'package.json');
  const manifestPath = resolve(__dirname, '..', 'public', 'manifest.json');

  const pkgRaw = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);

  const manifestRaw = await readFile(manifestPath, 'utf8');
  let manifest = JSON.parse(manifestRaw);

  if (manifest.version === pkg.version) {
    console.log(`manifest.json already at version ${pkg.version}`);
    return;
  }

  manifest.version = pkg.version;
  const newManifestRaw = JSON.stringify(manifest, null, 4) + '\n';
  await writeFile(manifestPath, newManifestRaw, 'utf8');
  console.log(`Updated manifest.json to version ${pkg.version}`);

  // Stage the manifest file for the upcoming Lerna commit
  try {
    const { spawnSync } = await import('child_process');
    const add = spawnSync('git', ['add', manifestPath], { stdio: 'inherit' });
    if (add.status !== 0) {
      console.warn('git add failed');
    } else {
      console.log('manifest.json staged for commit');
    }
  } catch (err) {
    console.error('Failed to stage manifest.json:', err);
  }
}

updateManifestVersion().catch(err => {
  console.error(err);
  process.exit(1);
});
