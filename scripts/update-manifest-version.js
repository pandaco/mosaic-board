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

  // Try to stage and amend the last commit if possible
  try {
    // Use simple child_process spawnSync to run git commands
    const { spawnSync } = await import('child_process');
    const add = spawnSync('git', ['add', manifestPath], { stdio: 'inherit' });
    if (add.status !== 0) {
      console.warn('git add failed, skipping commit amend');
      return;
    }

    const amend = spawnSync('git', ['commit', '--no-edit', '--amend'], { stdio: 'inherit' });
    if (amend.status !== 0) {
      console.warn('git commit --amend failed, creating a new commit');
      const commitNew = spawnSync('git', ['commit', '-m', `chore(release): sync manifest version to ${pkg.version}`], { stdio: 'inherit' });
      if (commitNew.status !== 0) console.warn('git commit failed');
    }
  } catch (err) {
    console.error('Failed to run git commands:', err);
  }
}

updateManifestVersion().catch(err => {
  console.error(err);
  process.exit(1);
});
