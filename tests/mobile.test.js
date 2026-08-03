/* ==================================================================
   INSTALLATION MOBILE ET FRAÎCHEUR DES MISES À JOUR

   Deux exigences, dont la seconde est la plus sérieuse :

   1. L'application doit s'installer sur le téléphone du collaborateur
      et rester lisible sur un écran étroit.

   2. Une version corrigée doit ATTEINDRE ce téléphone. Une application
      installée qui sert un cache périmé ferait tourner un moteur
      comptable dépassé, et produirait des états faux sans que personne
      s'en aperçoive. C'est pourquoi le service worker travaille en
      réseau d'abord — ces tests l'imposent.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { RACINE, cheminApplication } from './harness.js';

const DIST = path.join(RACINE, 'dist');
const lire = f => fs.readFileSync(path.join(DIST, f), 'utf8');

/* ---------------- Fichiers d'hébergement ---------------- */

test('HÉBERGEMENT — index.html existe et reprend le livrable à l’identique', () => {
    // Firebase Hosting sert index.html à la racine : sans lui, le site
    // répond 404 alors même que le livrable est déployé.
    assert.ok(fs.existsSync(path.join(DIST, 'index.html')), 'dist/index.html absent');
    assert.equal(lire('index.html'), fs.readFileSync(cheminApplication(), 'utf8'),
        'index.html diverge du livrable nommé');
});

test('HÉBERGEMENT — manifest, service worker et icônes sont produits', () => {
    for(const f of ['manifest.json', 'sw.js',
                    'assets/seven7-icon-192.png', 'assets/seven7-icon-512.png',
                    'assets/seven7-icon-180.png'])
        assert.ok(fs.existsSync(path.join(DIST, f)), `absent de dist/ : ${f}`);
});

/* ---------------- Manifest ---------------- */

test('MANIFEST — les champs exigés pour l’installation sont renseignés', () => {
    const m = JSON.parse(lire('manifest.json'));
    assert.ok(m.name && m.short_name, 'nom manquant');
    assert.equal(m.display, 'standalone', 'sans standalone, pas d’application plein écran');
    assert.ok(m.start_url, 'start_url manquant');
    assert.equal(m.lang, 'fr');
    assert.ok(m.theme_color && m.background_color);
});

test('MANIFEST — les icônes déclarées existent et couvrent les tailles utiles', () => {
    const m = JSON.parse(lire('manifest.json'));
    const tailles = m.icons.map(i => i.sizes);
    assert.ok(tailles.includes('192x192'), 'icône 192 absente — Android l’exige');
    assert.ok(tailles.includes('512x512'), 'icône 512 absente — écran de démarrage');
    assert.ok(m.icons.some(i => i.purpose === 'maskable'),
        'icône maskable absente : Android rognerait le logo');
    for(const i of m.icons)
        assert.ok(fs.existsSync(path.join(DIST, i.src)), `icône déclarée mais absente : ${i.src}`);
});

/* ---------------- Service worker ---------------- */

test('SW — la stratégie est le réseau d’abord, jamais le cache d’abord', () => {
    // La propriété la plus importante du fichier. Un cache-first
    // laisserait un cabinet travailler des semaines sur un moteur périmé.
    const sw = lire('sw.js');
    const iFetch = sw.indexOf('e.respondWith(');
    const suite = sw.slice(iFetch, iFetch + 400);
    assert.match(suite, /^\s*e\.respondWith\(\s*fetch\(req\)/m,
        'la réponse ne part pas du réseau : stratégie inversée');
    assert.match(sw, /caches\.match\(req\)/, 'aucun repli hors ligne');
    assert.ok(sw.indexOf('fetch(req)') < sw.indexOf('caches.match(req)'),
        'le cache est consulté avant le réseau');
});

test('SW — le nom du cache porte la version, et les anciens sont purgés', () => {
    const sw = lire('sw.js');
    assert.ok(!sw.includes('@@VERSION@@'), 'le marqueur de version n’a pas été remplacé');
    const m = /var CACHE = 'seven7-' \+ VERSION/.exec(sw);
    assert.ok(m, 'le cache ne porte pas la version');
    assert.match(sw, /var VERSION = '\d+\.\d+\.\d+-[0-9a-f]+'/, 'version mal formée');
    assert.match(sw, /caches\.delete\(n\)/, 'les anciens caches ne sont pas supprimés');
});

test('SW — les appels externes ne sont pas interceptés', () => {
    // Mettre Firestore ou le SDK Firebase en cache casserait la
    // synchronisation entre collaborateurs.
    const sw = lire('sw.js');
    assert.match(sw, /url\.origin !== self\.location\.origin\) return/,
        'les requêtes d’autres origines doivent passer sans interception');
    assert.match(sw, /req\.method !== 'GET'\) return/, 'les écritures ne doivent pas être interceptées');
});

test('SW — la nouvelle version prend la main sans attendre', () => {
    const sw = lire('sw.js');
    assert.match(sw, /self\.skipWaiting\(\)/, 'sans skipWaiting, la correction attend la fermeture de tous les onglets');
    assert.match(sw, /self\.clients\.claim\(\)/);
});

/* ---------------- La page ---------------- */

test('PAGE — les balises d’installation sont présentes, y compris pour iOS', () => {
    const html = lire('index.html');
    assert.match(html, /<link rel="manifest" href="manifest\.json">/);
    assert.match(html, /<meta name="theme-color"/);
    // iOS ignore le manifest : sans ces balises, pas d'installation sur iPhone.
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(html, /apple-touch-icon/);
    assert.match(html, /viewport-fit=cover/, 'sans cela, l’encoche recouvre la navigation');
});

test('PAGE — le viewport est adapté au mobile', () => {
    assert.match(lire('index.html'), /width=device-width, initial-scale=1\.0/);
});

/* ---------------- Lisibilité sur écran étroit ---------------- */

test('MOBILE — aucun tableau ne déborde sans conteneur défilant', async () => {
    // Sur un téléphone, les dernières colonnes — conclusion, suppression —
    // deviendraient inatteignables.
    const d = new JSDOM(lire('index.html'), {
        runScripts: 'dangerously', pretendToBeVisual: true,
        url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
    });
    await new Promise(r => {
        if(d.window.document.readyState === 'complete') return r();
        d.window.addEventListener('load', r, { once:true });
    });
    await new Promise(r => setTimeout(r, 60));

    const W = d.window;
    const nus = [];
    W.document.querySelectorAll('.tab-content table').forEach(t => {
        if(!t.closest('.scroll-table') && !t.closest('.scroll-x'))
            nus.push(t.id || t.closest('.tab-content').id);
    });
    assert.deepEqual(nus, [], 'tableaux sans conteneur défilant');
    assert.ok(W.document.querySelectorAll('.scroll-x').length > 20,
        'l’enveloppement automatique n’a pas eu lieu');
    W.close();
});

test('MOBILE — la feuille de style prévoit les écrans étroits', () => {
    const html = lire('index.html');
    assert.match(html, /@media \(max-width: 900px\)/, 'aucune règle pour petit écran');
    assert.match(html, /\.scroll-x \{ overflow-x: auto/);
    assert.match(html, /-webkit-overflow-scrolling: touch/, 'inertie tactile iOS absente');
});
