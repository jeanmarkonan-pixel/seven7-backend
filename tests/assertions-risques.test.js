/* ==================================================================
   ASSERTIONS D'AUDIT ET RISQUES INHÉRENTS PAR SECTEUR

   La bibliothèque relie trois choses qui n'étaient pas reliées :
   un cycle comptable, un risque inhérent, et l'assertion que la
   diligence proposée vient couvrir.

   Ces tests protègent surtout l'intégrité du référentiel : un risque
   qui cite une assertion inexistante, ou un cycle inconnu, disparaît
   silencieusement de la cartographie que l'auditeur croit complète.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

const ASSERTIONS = local(S.ASSERTIONS);
const SECTEURS   = local(S.SECTEURS);
const RISQUES    = local(S.RISQUES_CYCLE);
const CYCLES     = local(S.CYCLES);

const codesAssertion = new Set(ASSERTIONS.map(a => a.code));
const idsCycle       = new Set(CYCLES.map(c => c.id));

/* ---------------- Le référentiel des assertions ---------------- */

test('ASSERTIONS — les treize assertions des trois catégories sont déclarées', () => {
    assert.equal(ASSERTIONS.length, 13);
    const parCat = {};
    for(const a of ASSERTIONS) parCat[a.cat] = (parCat[a.cat] || 0) + 1;
    assert.deepEqual(parCat, { Flux: 5, Soldes: 4, 'Présentation': 4 });
});

test('ASSERTIONS — chaque assertion a un code unique, un libellé et une définition', () => {
    assert.equal(codesAssertion.size, ASSERTIONS.length, 'code d’assertion en double');
    for(const a of ASSERTIONS){
        assert.match(a.code, /^[FSP]_[A-Z]{3}$/, `code mal formé : ${a.code}`);
        assert.ok(a.lib && a.lib.length > 2, `libellé manquant sur ${a.code}`);
        assert.ok(a.def && a.def.length > 30, `définition trop courte sur ${a.code}`);
    }
});

test('ASSERTIONS — la séparation des exercices et l’exhaustivité sont bien présentes', () => {
    // Ce sont les deux assertions que le programme de travail cite le plus :
    // le cut-off et les charges non comptabilisées.
    const libs = ASSERTIONS.map(a => a.lib);
    assert.ok(libs.includes('Séparation des exercices'));
    assert.equal(libs.filter(l => l === 'Exhaustivité').length, 3,
        'l’exhaustivité existe dans les trois catégories');
    assert.equal(S.assertLib('F_CUT'), 'Séparation des exercices (flux)');
    assert.equal(S.assertLib('INCONNU'), 'INCONNU', 'un code inconnu doit être rendu tel quel');
});

/* ---------------- Intégrité du référentiel des risques ---------------- */

test('RISQUES — tout risque de cycle vise un cycle connu et des assertions connues', () => {
    const fautes = [];
    for(const [cycId, liste] of Object.entries(RISQUES)){
        if(!idsCycle.has(cycId)) fautes.push(`cycle inconnu : ${cycId}`);
        for(const x of liste){
            for(const c of x.a || [])
                if(!codesAssertion.has(c)) fautes.push(`${cycId} : assertion inconnue « ${c} »`);
            if(!x.a || !x.a.length) fautes.push(`${cycId} : risque sans assertion — « ${x.r} »`);
            if(!x.d) fautes.push(`${cycId} : risque sans diligence — « ${x.r} »`);
        }
    }
    assert.deepEqual(fautes, []);
});

test('RISQUES — tout risque sectoriel vise un cycle connu et des assertions connues', () => {
    const fautes = [];
    for(const s of SECTEURS){
        if(!s.id || !s.nom || !s.ico) fautes.push(`secteur incomplet : ${s.id}`);
        for(const x of s.risques){
            if(!idsCycle.has(x.c)) fautes.push(`${s.id} : cycle inconnu « ${x.c} »`);
            for(const c of x.a || [])
                if(!codesAssertion.has(c)) fautes.push(`${s.id} : assertion inconnue « ${c} »`);
            if(!x.d) fautes.push(`${s.id} : risque sans diligence — « ${x.r} »`);
        }
    }
    assert.deepEqual(fautes, []);
});

test('RISQUES — les cotations restent dans l’échelle de 1 à 5', () => {
    const hors = [];
    const verifier = (ou, x) => {
        for(const champ of ['p', 'i']){
            const v = x[champ];
            if(v !== undefined && (!Number.isInteger(v) || v < 1 || v > 5))
                hors.push(`${ou} : ${champ} = ${v} — « ${x.r} »`);
        }
    };
    for(const [cycId, liste] of Object.entries(RISQUES)) liste.forEach(x => verifier(cycId, x));
    for(const s of SECTEURS) s.risques.forEach(x => verifier(s.id, x));
    assert.deepEqual(hors, []);
});

test('RISQUES — aucun libellé de risque en double au sein d’un même cycle', () => {
    for(const [cycId, liste] of Object.entries(RISQUES)){
        const vus = new Set();
        for(const x of liste){
            assert.ok(!vus.has(x.r), `${cycId} : risque en double — « ${x.r} »`);
            vus.add(x.r);
        }
    }
});

test('COUVERTURE — les onze cycles portent au moins un risque inhérent', () => {
    // Un cycle sans risque déclaré sortirait absent de la cartographie,
    // ce qui se lirait comme « aucun risque » plutôt que « non documenté ».
    const sans = CYCLES.filter(c => !(RISQUES[c.id] || []).length).map(c => `${c.id} ${c.nom}`);
    assert.deepEqual(sans, []);
});

test('COUVERTURE — chaque secteur documente au moins quatre risques propres', () => {
    const maigres = SECTEURS.filter(s => s.risques.length < 4)
                            .map(s => `${s.id} (${s.risques.length})`);
    assert.deepEqual(maigres, []);
    assert.ok(SECTEURS.length >= 12, `seulement ${SECTEURS.length} secteurs`);
});

test('COUVERTURE — les identifiants de secteur sont uniques', () => {
    const ids = SECTEURS.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length);
});

/* ---------------- Génération de la cartographie ---------------- */

test('CARTOGRAPHIE — sans secteur, seuls les risques de cycle sont produits', () => {
    const c = local(S.genererCartographie(''));
    const attendu = Object.values(RISQUES).reduce((n, l) => n + l.length, 0);
    assert.equal(c.length, attendu);
    assert.ok(c.every(l => l.origine === 'Cycle'));
});

test('CARTOGRAPHIE — un secteur ajoute ses risques sans remplacer les autres', () => {
    const base = local(S.genererCartographie('')).length;
    const transit = local(S.genererCartographie('TRANSIT'));
    const propre = SECTEURS.find(s => s.id === 'TRANSIT');
    assert.equal(transit.length, base + propre.risques.length);
    assert.equal(transit.filter(l => l.origine === propre.nom).length, propre.risques.length);
});

test('CARTOGRAPHIE — un secteur inconnu ne fait pas échouer la génération', () => {
    const c = local(S.genererCartographie('SECTEUR-QUI-N-EXISTE-PAS'));
    assert.equal(c.length, local(S.genererCartographie('')).length);
});

test('CARTOGRAPHIE — le score et le niveau suivent la règle affichée', () => {
    // L'onglet annonce « ≥15 Élevé · ≥8 Moyen · sinon Faible ».
    for(const l of local(S.genererCartographie('BTP'))){
        assert.equal(l.score, l.p * l.i, `score incohérent sur « ${l.risque} »`);
        const attendu = l.score >= 15 ? 'Élevé' : (l.score >= 8 ? 'Moyen' : 'Faible');
        assert.equal(l.niveau, attendu, `niveau incohérent sur « ${l.risque} » (${l.score})`);
    }
    assert.equal(S.risqueNiveau(15), 'Élevé');
    assert.equal(S.risqueNiveau(14), 'Moyen');
    assert.equal(S.risqueNiveau(8),  'Moyen');
    assert.equal(S.risqueNiveau(7),  'Faible');
});

test('CARTOGRAPHIE — les risques sont classés du plus grave au moins grave', () => {
    const c = local(S.genererCartographie('MICROFI'));
    for(let i = 1; i < c.length; i++)
        assert.ok(c[i-1].score >= c[i].score, `classement rompu à la ligne ${i}`);
});

test('CARTOGRAPHIE — chaque ligne nomme son cycle en clair, pas par identifiant', () => {
    for(const l of local(S.genererCartographie('HOTEL'))){
        assert.ok(l.cycleNom && l.cycleNom !== l.cycle,
            `cycle non résolu sur « ${l.risque} » : ${l.cycle}`);
        assert.ok(idsCycle.has(l.cycle));
    }
});

test('CARTOGRAPHIE — le secteur de la liasse de référence est couvert', () => {
    // MTTCI est une société de transit et transport : le secteur qui a servi
    // à valider tout le moteur doit figurer dans la bibliothèque.
    const transit = SECTEURS.find(s => s.id === 'TRANSIT');
    assert.ok(transit, 'secteur transit absent');
    const cycles = new Set(transit.risques.map(r => r.c));
    assert.ok(cycles.has('VTE') && cycles.has('ACH'),
        'le transit doit au moins couvrir les cycles ventes et achats');
});
