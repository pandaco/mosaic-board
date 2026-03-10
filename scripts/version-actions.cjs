const { default: JsVersionActions } = require('@nx/js/src/release/version-actions.js');
const { readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

async function afterAllProjectsVersioned(cwd, { dryRun }) {
  const packageJsonPath = resolve(cwd, 'package.json');
  const manifestJsonPath = resolve(cwd, 'public', 'manifest.json');
  const versionTsPath = resolve(cwd, 'src', 'app', 'version.ts');

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const { version } = packageJson;

  const manifestJson = JSON.parse(await readFile(manifestJsonPath, 'utf8'));
  manifestJson.version = version;

  const versionTsContent = `export const APP_VERSION = '${version}';\n`;

  if (!dryRun) {
    await writeFile(manifestJsonPath, `${JSON.stringify(manifestJson, null, 2)}\n`, 'utf8');
    await writeFile(versionTsPath, versionTsContent, 'utf8');
  }

  console.log(
    `${dryRun ? '[dry-run] Would sync' : 'Synced'} public/manifest.json and src/app/version.ts version to ${version}`
  );

  return {
    changedFiles: dryRun ? [] : ['public/manifest.json', 'src/app/version.ts'],
    deletedFiles: [],
  };
}

module.exports = JsVersionActions;
module.exports.default = JsVersionActions;
module.exports.afterAllProjectsVersioned = afterAllProjectsVersioned;
