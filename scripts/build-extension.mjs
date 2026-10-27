import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { mkdir, rm, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist-extension');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await build({
  entryPoints: [path.join(root, 'extension/content.js')],
  outfile: path.join(destination, 'content.js'),
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  legalComments: 'inline',
  banner: { js: '/* Multiedit by Chase Kubala. MIT license. https://github.com/chaseakub/multiedit */' },
});
for (const file of ['manifest.json', 'worker.js']) {
  await copyFile(path.join(root, 'extension', file), path.join(destination, file));
}
await copyFile(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE'));
await copyFile(path.join(root, 'PRIVACY.md'), path.join(destination, 'PRIVACY.md'));
const iconDir = path.join(root, 'extension/icons');
try {
  await mkdir(path.join(destination, 'icons'), { recursive: true });
  for (const file of await readdir(iconDir)) {
    await copyFile(path.join(iconDir, file), path.join(destination, 'icons', file));
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const files = {};
async function collect(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await collect(path.join(dir, entry.name), relative + '/');
    else files['multiedit/' + relative] = [new Uint8Array(await readFile(path.join(dir, entry.name))), { mtime: new Date('2026-01-01T00:00:00Z') }];
  }
}
await collect(destination);
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/multiedit.zip'), zipSync(files, { level: 9 }));
console.log('Extension built: dist-extension/ and dist/multiedit.zip');
