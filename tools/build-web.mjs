#!/usr/bin/env node
/**
 * Finalise la version web après `expo export --platform web` :
 * - sw.js : service worker qui met toute l'app en cache (fonctionnement hors ligne) ;
 * - 404.html : copie de index.html, pour que GitHub Pages serve l'app sur toutes les routes ;
 * - .nojekyll : GitHub Pages ne doit pas ignorer le dossier `_expo/`.
 *
 * Usage : npm run build:web
 */
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const BASE = '/very-up/';
const SKIP = new Set(['metadata.json', 'sw.js', '404.html', '.nojekyll']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(DIST)
  .map((path) => relative(DIST, path).split(sep).join('/'))
  .filter((file) => !SKIP.has(file))
  .sort();

// La version du cache change dès qu'un fichier change : les joueurs reçoivent la mise à jour.
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(DIST, file)));
const version = hash.digest('hex').slice(0, 12);

const precache = [BASE, ...files.filter((f) => f !== 'index.html').map((f) => BASE + f)];

const sw = `// Généré par tools/build-web.mjs — ne pas modifier à la main.
const CACHE = 'very-up-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  // Supprime les caches des anciennes versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('very-up-') && k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('${BASE}')) return;

  // Navigation (ouverture de l'app, rechargement d'une page) : toujours la page de l'app.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('${BASE}').then((cached) => cached || fetch(request)));
    return;
  }

  // Le reste : cache d'abord, réseau sinon (et on garde la réponse pour la prochaine fois).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
`;

writeFileSync(join(DIST, 'sw.js'), sw);
copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`Version web prête : ${precache.length} fichiers mis en cache (version ${version}).`);
