/* ==================================================================
   SEVEN7 — CONSTRUCTION DU LIVRABLE

   Reconstitue dist/seven7-app.html à partir de src/app.html et des
   fichiers de src/js/, dans l'ordre déclaré par build/manifeste.json.

   Ce build remplace splice.py, qui cherchait des chaînes de texte
   exactes dans le HTML et les remplaçait — treize étapes dont deux
   avaient déjà cassé silencieusement. Ici la source de vérité est
   src/ ; dist/ n'est qu'un produit, et le fichier ne peut pas
   diverger de ses sources.

   La concaténation est volontairement littérale : les fichiers de
   src/js/ sont des scripts classiques, pas des modules ES, et
   partagent une portée globale unique. C'est ce que suppose tout le
   HTML généré par innerHTML, dont les attributs onclick appellent
   les fonctions par leur nom global. Passer en vrais modules ES
   demanderait d'exposer explicitement chaque fonction appelée depuis
   un attribut ; c'est faisable, mais pas sans couverture DOM.

       node build/build.mjs              construit
       node build/build.mjs --verifier   construit et compare au
                                         livrable existant sans l'écrire
   ================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const SORTIE = path.join(RACINE, 'dist', 'seven7-app_v2_9_NAV-ECLATEE.html');

const manifeste = JSON.parse(fs.readFileSync(path.join(ICI, 'manifeste.json'), 'utf8'));
const squelette = fs.readFileSync(path.join(RACINE, 'src', 'app.html'), 'utf8');

let html = squelette;
let totalFichiers = 0;

for(const [marqueur, fichiers] of Object.entries(manifeste)){
    const jeton = `/* @@${marqueur}@@ */`;
    const occurrences = html.split(jeton).length - 1;
    if(occurrences !== 1)
        throw new Error(`marqueur @@${marqueur}@@ trouvé ${occurrences} fois dans src/app.html — il en faut exactement une`);

    const morceaux = fichiers.map(nom => {
        const p = path.join(RACINE, 'src', 'js', nom);
        if(!fs.existsSync(p)) throw new Error(`fichier absent : src/js/${nom}`);
        totalFichiers++;
        return fs.readFileSync(p, 'utf8');
    });
    html = html.replace(jeton, () => morceaux.join('\n'));
}

const restants = html.match(/\/\* @@\w+@@ \*\//g);
if(restants) throw new Error(`marqueurs non résolus : ${restants.join(', ')}`);

const verifier = process.argv.includes('--verifier');
if(verifier){
    const actuel = fs.readFileSync(SORTIE, 'utf8');
    if(actuel === html){
        console.log(`✓ identique au livrable existant — ${totalFichiers} fichiers, ${(html.length/1024/1024).toFixed(2)} Mo`);
    } else {
        const a = actuel.split('\n'), b = html.split('\n');
        let i = 0;
        while(i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
        console.error(`✗ divergence à la ligne ${i+1}`);
        console.error(`  livrable : ${JSON.stringify((a[i]||'').slice(0,110))}`);
        console.error(`  construit: ${JSON.stringify((b[i]||'').slice(0,110))}`);
        console.error(`  ${a.length} lignes contre ${b.length}`);
        process.exit(1);
    }
} else {
    fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
    fs.writeFileSync(SORTIE, html, 'utf8');
    console.log(`✓ dist/${path.basename(SORTIE)} — ${totalFichiers} fichiers, ${(html.length/1024/1024).toFixed(2)} Mo`);
}
