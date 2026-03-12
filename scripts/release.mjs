/**
 * Orchestrates the full release flow:
 * 1. nx release version  — bumps version (no git)
 * 2. nx release changelog — generates/updates CHANGELOG.md (no git)
 * 3. single git commit + tag combining both changes
 *
 * Usage:
 *   node scripts/release.mjs            # real release
 *   node scripts/release.mjs --dry-run  # preview only
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const isDryRun = process.argv.includes('--dry-run');
const flags = isDryRun ? ['--dry-run'] : [];

// Step 1: bump version (no git commit)
const versionResult = spawnSync(
  'npx',
  ['nx', 'release', 'version', '--projects', 'mosaic-board', ...flags],
  { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' }
);

process.stdout.write(versionResult.stdout ?? '');

if (versionResult.status !== 0) {
  process.exit(versionResult.status ?? 1);
}

// Step 2: resolve new version
let version;
if (isDryRun) {
  const match = versionResult.stdout?.match(/new version (\d+\.\d+\.\d+)/);
  if (!match) {
    console.log('\n[dry-run] Could not determine next version — skipping changelog preview.');
    process.exit(0);
  }
  version = match[1];
} else {
  version = JSON.parse(readFileSync('./package.json', 'utf8')).version;
}

// Step 3: generate changelog (no git commit)
console.log(`\nGenerating changelog for v${version}...\n`);
const changelogResult = spawnSync(
  'npx',
  ['nx', 'release', 'changelog', version, '--projects', 'mosaic-board', ...flags],
  { stdio: 'inherit' }
);

if (changelogResult.status !== 0) {
  process.exit(changelogResult.status ?? 1);
}

// Step 4: single commit + tag
if (!isDryRun) {
  console.log(`\nCommitting release v${version}...\n`);
  execFileSync('git', ['add', 'package.json', 'public/manifest.json', 'src/app/version.ts', 'CHANGELOG.md'], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', `chore(release): v${version}`], { stdio: 'inherit' });
  execFileSync('git', ['tag', `v${version}`], { stdio: 'inherit' });
  console.log(`\nTagged v${version}`);
} else {
  console.log(`\n[dry-run] Would commit and tag v${version}`);
}
