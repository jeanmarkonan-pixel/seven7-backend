/* ==================================================================
   CHANTIER 2 — LE LIVRABLE EST UN PRODUIT, PLUS UNE SOURCE

   dist/ est reconstruit par build/build.mjs à partir de src/app.html
   et des 23 fichiers de src/js/. Ces tests garantissent que le
   livrable n'a pas été édité directement : si quelqu'un modifie
   dist/ sans toucher src/, la construction ne redonne plus le même
   fichier et le premier test échoue.

   C'est le garde-fou qui manquait à splice.py, qui cherchait des
   ancres textuelles dans le HTML et pouvait échouer silencieusement.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RACINE, cheminApplication, blocsScript, chargerApplication } from './harness.js';

test('BUILD — le livrable correspond exactement à ses sources', () => {
    // Échoue si dist/ a été édité à la main, ou si un fichier de src/js
    // a été modifié sans reconstruire.
    execFileSync(process.execPath, [path.join(RACINE, 'build', 'build.mjs'), '--verifier'],
                 { cwd: RACINE, stdio: 'pipe' });
});

test('BUILD — le manifeste couvre tous les fichiers de src/js, et rien de plus', () => {
    const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'manifeste.json'), 'utf8'));
    const declares = Object.values(manifeste).flat();
    const surDisque = fs.readdirSync(path.join(RACINE, 'src', 'js')).filter(f => f.endsWith('.js'));
    assert.deepEqual([...declares].sort(), [...surDisque].sort(),
        'un fichier de src/js/ est absent du manifeste, ou l’inverse');
    assert.equal(new Set(declares).size, declares.length, 'doublon dans le manifeste');
});

test('BUILD — chaque marqueur du squelette est résolu une fois et une seule', () => {
    const squelette = fs.readFileSync(path.join(RACINE, 'src', 'app.html'), 'utf8');
    const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'manifeste.json'), 'utf8'));
    const marqueurs = [...squelette.matchAll(/\/\* @@(\w+)@@ \*\//g)].map(m => m[1]);
    assert.deepEqual(marqueurs.sort(), Object.keys(manifeste).sort());
    for(const m of marqueurs)
        assert.equal(squelette.split(`/* @@${m}@@ */`).length - 1, 1, `marqueur @@${m}@@ en double`);
});

test('BUILD — plus aucune fonction n’est déclarée deux fois', () => {
    // Les modules ajoutés surchargeaient des fonctions du code d'origine
    // en profitant du hoisting. Les versions mortes ont été retirées :
    // src/js est désormais le code de référence, pas un empilement.
    const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'manifeste.json'), 'utf8'));
    const vues = new Map();
    for(const nom of Object.values(manifeste).flat()){
        const src = fs.readFileSync(path.join(RACINE, 'src', 'js', nom), 'utf8');
        for(const m of src.matchAll(/^function\s+(\w+)\s*\(/gm)){
            if(!vues.has(m[1])) vues.set(m[1], []);
            vues.get(m[1]).push(nom);
        }
    }
    const doublons = [...vues].filter(([, f]) => f.length > 1)
                              .map(([n, f]) => `${n} (${f.join(', ')})`);
    assert.deepEqual(doublons, [], 'fonctions déclarées plusieurs fois');
});

test('VERSION — le livrable porte une estampille cohérente avec package.json', () => {
    // Un cabinet client doit pouvoir dire quelle version il utilise.
    const app = chargerApplication();
    const v = app.sandbox.SEVEN7_VERSION;
    assert.ok(v, 'SEVEN7_VERSION absent — lancez `npm run estampiller` puis `npm run build`');

    const pkg = JSON.parse(fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));
    assert.equal(v.version, pkg.version, 'estampille périmée par rapport à package.json');
    assert.match(v.commit, /^[0-9a-f]{7,}$|^hors-depot$/, 'hash de commit mal formé');
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, 'date mal formée');
    assert.equal(typeof v.propre, 'boolean');
});

test('VERSION — l’estampille est lisible et signale un livrable bricolé', () => {
    const app = chargerApplication();
    const texte = app.evaluer('seven7VersionTexte()');
    const v = app.sandbox.SEVEN7_VERSION;
    assert.ok(texte.startsWith('v' + v.version + ' · ' + v.commit), `format inattendu : ${texte}`);
    assert.equal(texte.includes('+modifié'), !v.propre,
        'le drapeau « modifié » doit apparaître si et seulement si le dépôt était sale');
});

test('VERSION — l’application a bien où afficher l’estampille', () => {
    // seven7AfficherVersion() écrit dans ces deux éléments ; si l'un
    // disparaît du squelette, l'estampille devient invisible là où on la
    // cherche, sans que rien ne le signale.
    //
    // L'écran de connexion en porte une copie parce qu'il recouvre
    // l'en-tête : un client bloqué avant authentification doit pouvoir
    // lire sa version pour l'indiquer au support.
    const html = fs.readFileSync(cheminApplication(), 'utf8');
    for(const id of ['seven7-version', 'seven7-version-lock'])
        assert.equal(html.split(`id="${id}"`).length - 1, 1,
            `élément #${id} absent ou en double dans src/app.html`);
});

test('BUILD — le livrable garde ses quatre blocs de script inline', () => {
    const html = fs.readFileSync(cheminApplication(), 'utf8');
    assert.equal(blocsScript(html).length, 4);
    // Le SDK Firebase (3 balises), lz-string et SheetJS (lecture des relevés
    // bancaires Excel, onglet Rapprochement Bancaire) restent chargés par
    // balise externe.
    const externes = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    assert.equal(externes.length, 5);
    assert.ok(externes.every(u => u.startsWith('https://')), 'script externe en clair');
    assert.ok(externes.some(u => /xlsx/i.test(u)), 'SheetJS absent — l’import Excel des relevés ne fonctionnerait plus');
});
