const { default: JsVersionActions } = require('@nx/js/src/release/version-actions.js');
const { readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

async function afterAllProjectsVersioned(cwd, { dryRun }) {
  const packageJsonPath = resolve(cwd, 'package.json');
  const manifestJsonPath = resolve(cwd, 'public', 'manifest.json');

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const manifestJson = JSON.parse(await readFile(manifestJsonPath, 'utf8'));

  manifestJson.version = packageJson.version;

  if (!dryRun) {
    await writeFile(manifestJsonPath, `${JSON.stringify(manifestJson, null, 2)}\n`, 'utf8');
  }

  console.log(
    `${dryRun ? '[dry-run] Would sync' : 'Synced'} public/manifest.json version to ${packageJson.version}`
  );

  return {
    changedFiles: dryRun ? [] : ['public/manifest.json'],
    deletedFiles: [],
  };
}

module.exports = JsVersionActions;
module.exports.default = JsVersionActions;
module.exports.afterAllProjectsVersioned = afterAllProjectsVersioned;
