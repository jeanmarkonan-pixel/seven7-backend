/* ==================================================================
   SEVEN7 — HARNAIS DE TEST
   Charge les blocs <script> inline de l'application dans un bac à
   sable Node, sans navigateur. Suffisant pour tester tout le moteur
   de calcul (liasse, cycles, parsing). Les tests d'interface passent
   par jsdom (voir dom.test.js).
   ================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ICI, '..');

/** Chemin du fichier HTML à tester (surchargeable : SEVEN7_HTML=... node --test) */
export function cheminApplication(){
    if(process.env.SEVEN7_HTML) return path.resolve(process.env.SEVEN7_HTML);
    const dist = path.join(RACINE, 'dist');
    const fichiers = fs.readdirSync(dist).filter(f => f.endsWith('.html')).sort();
    if(!fichiers.length) throw new Error('Aucun fichier .html dans dist/');
    return path.join(dist, fichiers[fichiers.length - 1]);
}

/** Extrait les blocs <script> inline (hors ceux qui ont un src) */
export function blocsScript(html){
    return [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

/** Stub DOM minimal : suffisant pour que les blocs s'évaluent sans navigateur */
function elementFactice(id){
    return {
        id, innerHTML:'', textContent:'', value:'', checked:false, style:{},
        classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
        querySelector(){ return null; }, querySelectorAll(){ return []; },
        appendChild(){}, removeChild(){}, addEventListener(){}, matches(){ return false; },
        setAttribute(){}, getAttribute(){ return null; }, hasAttribute(){ return false; },
        click(){}, remove(){}, dataset:{}
    };
}

/**
 * Charge l'application et renvoie un contexte exploitable.
 * @returns {{ sandbox:object, evaluer:(code:string)=>any, elements:object }}
 */
export function chargerApplication(cheminHtml = cheminApplication()){
    const html = fs.readFileSync(cheminHtml, 'utf8');
    const elements = {};
    const parId = id => elements[id] || (elements[id] = elementFactice(id));
    const memoire = {};

    const sandbox = {
        console,
        document: {
            getElementById: parId,
            querySelector(){ return null; },
            querySelectorAll(){ return []; },
            createElement: () => elementFactice('tmp'),
            addEventListener(){},
            get body(){ return parId('body'); },
            readyState: 'complete'
        },
        localStorage: {
            getItem: k => (k in memoire ? memoire[k] : null),
            setItem: (k, v) => { memoire[k] = String(v); },
            removeItem: k => { delete memoire[k]; }
        },
        navigator: {}, alert(){}, setTimeout(){}, clearTimeout(){},
        MutationObserver: undefined
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    const erreurs = [];
    for(const bloc of blocsScript(html)){
        try{ vm.runInContext(bloc, sandbox); }
        catch(e){ erreurs.push(e.message); }
    }
    /* Les blocs contiennent du code d'initialisation qui suppose un vrai
       navigateur ; les erreurs y sont attendues. Les déclarations de
       fonctions sont hoistées, donc le moteur reste utilisable. */

    return {
        sandbox, elements, erreurs,
        evaluer: code => vm.runInContext(code, sandbox),
        chargerBalances(balances){ sandbox.balanceData = balances; },
        definirSeuils(s){ sandbox.seuils = Object.assign({}, sandbox.seuils, s); }
    };
}

/** Charge le jeu de référence MTTCI (balances N et N-1) */
export function balancesMTTCI(){
    return JSON.parse(fs.readFileSync(path.join(RACINE, 'tests/fixtures/mttci-balances.json'), 'utf8'));
}

/** Charge les états DGI attendus (bilan, résultat, TFT) */
export function liasseReference(){
    return JSON.parse(fs.readFileSync(path.join(RACINE, 'tests/fixtures/mttci-liasse-reference.json'), 'utf8'));
}

/** Arrondi à l'unité, pour comparer des montants en FCFA */
export const arrondi = v => Math.round(v || 0);
