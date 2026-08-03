/* ==================================================================
   SEVEN7 — ESTAMPILLE DE VERSION

   Écrit src/js/00-version.js à partir de la version de package.json et
   de l'état du dépôt Git. Ce fichier est VERSIONNÉ, pas généré à chaque
   construction : sinon dist/ changerait à chaque build (la date, le
   hash) et `npm run verifier` ne pourrait plus rien comparer.

   À lancer délibérément, au moment de figer une livraison :

       npm run estampiller    # estampille l'état courant
       npm run build          # reconstruit dist/
       git commit             # les deux ensemble

   Le script ne s'appelle pas « version » : ce nom est un point d'entrée
   du cycle de vie npm, déclenché par `npm version`, ce qui produirait
   des estampillages involontaires.

   L'estampille porte le hash du commit PRÉCÉDENT, puisqu'elle est
   écrite avant d'être committée. C'est voulu et signalé dans
   l'application : ce hash désigne le code, pas le commit qui l'emballe.
   ================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));

const git = (...args) => {
    try { return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8' }).trim(); }
    catch { return ''; }
};

const commit = git('rev-parse', '--short', 'HEAD') || 'hors-depot';
const date   = new Date().toISOString().slice(0, 10);

/* L'estampillage réécrit lui-même src/js/00-version.js puis dist/ : ces
   deux chemins sont donc toujours modifiés à cet instant et ne disent rien
   de l'état réel du travail. On ne regarde que le reste — c'est là qu'un
   livrable bricolé se trahit. */
const propre = git('status', '--porcelain')
    .split('\n')
    .map(l => l.slice(3).trim())
    .filter(Boolean)
    .filter(f => f !== 'src/js/00-version.js' && !f.startsWith('dist/'))
    .length === 0;

const contenu = `/* Généré par build/version.mjs — ne pas modifier à la main.
   Régénérer avec \`npm run estampiller\`, puis \`npm run build\`. */
var SEVEN7_VERSION = {
    version: ${JSON.stringify(pkg.version)},
    commit:  ${JSON.stringify(commit)},
    date:    ${JSON.stringify(date)},
    propre:  ${propre}
};

/* Rend l'estampille lisible : "v2.9.0 · bc32dcb · 2026-08-03".
   Un dépôt qui portait des modifications non committées au moment de
   l'estampillage est signalé, pour qu'un livrable bricolé ne puisse pas
   se faire passer pour une version propre. */
function seven7VersionTexte(){
    var v = SEVEN7_VERSION;
    return 'v' + v.version + ' · ' + v.commit + (v.propre ? '' : '+modifié') + ' · ' + v.date;
}

function seven7AfficherVersion(){
    var texte = seven7VersionTexte();
    var ids = ['seven7-version', 'seven7-version-lock'];
    for(var i = 0; i < ids.length; i++){
        var el = document.getElementById(ids[i]);
        if(el) el.textContent = texte;
    }
}

/* Auto-branchement : ce module est le premier du bundle, le DOM n'existe
   pas encore quand il s'évalue. On attend donc le chargement, sans
   dépendre de l'orchestrateur d'initialisation du reste du code. */
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', seven7AfficherVersion);
        else
            seven7AfficherVersion();
    }
}catch(e){}
`;

const cible = path.join(RACINE, 'src', 'js', '00-version.js');
fs.writeFileSync(cible, contenu, 'utf8');
console.log(`✓ src/js/00-version.js — v${pkg.version} · ${commit}${propre ? '' : '+modifié'} · ${date}`);
if(!propre) console.log('  ⚠ dépôt modifié au moment de l’estampillage : l’application l’affichera');
