// Reproducible packaging using the already extracted Electron runtime.
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
async function main() {
  const root = path.resolve(__dirname, '..');
  const stage = fs.mkdtempSync(path.join(root, 'release', 'stage-'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
    name: manifest.name, version: manifest.version, main: manifest.main,
    description: manifest.description, author: manifest.author
  }));
  for (const folder of ['dist', 'electron']) fs.cpSync(path.join(root, folder), path.join(stage, folder), { recursive: true });
  await asar.createPackage(stage, path.join(root, 'release', 'purrductive-unpacked', 'resources', 'app.asar'));
  // Only delete the unique staging directory created by this invocation.
  fs.rmSync(stage, { recursive: true, force: true });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
