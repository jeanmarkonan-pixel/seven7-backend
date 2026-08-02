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
import { RACINE, cheminApplication, blocsScript } from './harness.js';

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

test('BUILD — le livrable garde ses quatre blocs de script inline', () => {
    const html = fs.readFileSync(cheminApplication(), 'utf8');
    assert.equal(blocsScript(html).length, 4);
    // Le SDK Firebase et lz-string restent chargés par balise externe.
    const externes = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    assert.equal(externes.length, 4);
    assert.ok(externes.every(u => u.startsWith('https://')), 'script externe en clair');
});
