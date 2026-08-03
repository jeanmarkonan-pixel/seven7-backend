/* ==================================================================
   DILIGENCES NORMATIVES DE LA MISSION

   Les douze sections couvrent ce que les normes imposent autour du
   contrôle des comptes, et dont plusieurs sont d'ordre public en zone
   OHADA. Une section absente ou mal déclarée ne se voit pas à l'écran :
   l'onglet manque, et le dossier passe pour complet.

   Ces tests protègent l'intégrité du référentiel et l'installation des
   onglets, y compris la déclaration dans TABS — sans laquelle un onglet
   s'affiche mais ne se sauvegarde jamais.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));
const DILIGENCES = local(S.DILIGENCES);

const TYPES = new Set(['oui', 'texte', 'zone', 'date', 'nom']);

/* ---------------- Intégrité du référentiel ---------------- */

test('SECTIONS — les douze sections couvrent les trois phases', () => {
    assert.equal(DILIGENCES.length, 12);
    const parPhase = {};
    for(const d of DILIGENCES) parPhase[d.phase] = (parPhase[d.phase] || 0) + 1;
    assert.deepEqual(parPhase, { 1: 3, 2: 4, 3: 5 });
});

test('SECTIONS — chaque section porte sa base normative et son objectif', () => {
    for(const d of DILIGENCES){
        assert.ok(d.id && /^[a-z-]+$/.test(d.id), `identifiant mal formé : ${d.id}`);
        assert.ok(d.ico && d.titre, `${d.id} : icône ou titre manquant`);
        assert.ok(d.norme && d.norme.length > 5, `${d.id} : base normative absente`);
        assert.ok(d.objectif && d.objectif.length > 60, `${d.id} : objectif trop court`);
        assert.ok([1, 2, 3].includes(d.phase), `${d.id} : phase ${d.phase}`);
    }
});

test('SECTIONS — les identifiants sont uniques et ne heurtent aucun onglet existant', () => {
    const ids = DILIGENCES.map(d => d.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiant de section en double');
    // Les onglets d'origine sont déclarés dans TABS par le module 10.
    const origine = ['sommaire','identification','planification','programme','questionnaire',
                     'risques','bilan','resultat','detection','revue','synthese','redaction'];
    for(const id of ids)
        assert.ok(!origine.includes(id), `${id} écraserait un onglet existant`);
});

test('POINTS — chaque point a une question et un type de saisie connu', () => {
    const fautes = [];
    for(const d of DILIGENCES){
        assert.ok(d.points.length >= 8, `${d.id} : seulement ${d.points.length} points`);
        for(const p of d.points){
            if(!p.q || p.q.length < 15) fautes.push(`${d.id} : question trop courte — « ${p.q} »`);
            if(!TYPES.has(p.t)) fautes.push(`${d.id} : type inconnu « ${p.t} »`);
        }
    }
    assert.deepEqual(fautes, []);
});

test('POINTS — aucune question en double au sein d’une même section', () => {
    for(const d of DILIGENCES){
        const vus = new Set();
        for(const p of d.points){
            assert.ok(!vus.has(p.q), `${d.id} : question en double — « ${p.q} »`);
            vus.add(p.q);
        }
    }
});

/* ---------------- Les diligences que la norme rend obligatoires ---------------- */

test('OBLIGATOIRE — la discussion d’équipe sur la fraude est documentée', () => {
    // ISA 240 §15 : cette discussion est exigée, et sa date doit figurer
    // au dossier. Sans elle, la diligence n'est pas démontrée.
    const fraude = DILIGENCES.find(d => d.id === 'fraude');
    assert.ok(fraude, 'section fraude absente');
    assert.ok(fraude.points.some(p => p.t === 'date' && /discussion/i.test(p.q)),
        'la date de la discussion d’équipe doit être saisissable');
    assert.ok(fraude.points.some(p => /comptabilisation des produits/i.test(p.q)),
        'le risque présumé sur les produits doit être traité');
    assert.ok(fraude.points.some(p => /contournement des contrôles/i.test(p.q)),
        'le contournement des contrôles par la direction doit être traité');
});

test('OBLIGATOIRE — le test des écritures comptables a sa propre section', () => {
    // ISA 240 §32 : diligence non substituable.
    const e = DILIGENCES.find(d => d.id === 'ecritures');
    assert.ok(e, 'section test des écritures absente');
    assert.match(e.norme, /240/);
    assert.ok(e.points.length >= 10);
});

test('OBLIGATOIRE — la lettre d’affirmation couvre les sujets exigés', () => {
    const a = DILIGENCES.find(d => d.id === 'affirmations');
    assert.ok(a);
    for(const sujet of [/fraude/i, /parties liées/i, /événements postérieurs/i,
                        /anomalies non corrigées/i, /litiges/i])
        assert.ok(a.points.some(p => sujet.test(p.q)),
            `la lettre d’affirmation doit couvrir ${sujet}`);
});

test('OHADA — la procédure d’alerte et les vérifications spécifiques sont couvertes', () => {
    const c = DILIGENCES.find(d => d.id === 'continuite');
    assert.match(c.norme, /AUSCGIE/);
    assert.ok(c.points.some(p => /demande d'explications/i.test(p.q)),
        'la première phase de l’alerte doit être documentée');
    assert.ok(c.points.some(p => /moitié du capital/i.test(p.q)),
        'la perte de la moitié du capital doit être contrôlée');

    const v = DILIGENCES.find(d => d.id === 'verifications-legales');
    assert.ok(v, 'section vérifications spécifiques absente');
    for(const sujet of [/rapport de gestion/i, /égalité entre associés/i, /réserve légale/i])
        assert.ok(v.points.some(p => sujet.test(p.q)), `vérification manquante : ${sujet}`);
});

test('OHADA — les conventions réglementées alimentent le rapport spécial', () => {
    const p = DILIGENCES.find(d => d.id === 'parties-liees');
    assert.match(p.norme, /AUSCGIE/);
    assert.ok(p.points.some(x => /rapport spécial/i.test(x.q)),
        'le rapport spécial doit être exigé');
    assert.ok(p.points.some(x => /conventions interdites/i.test(x.q)),
        'les conventions interdites doivent être recherchées');
});

test('OBLIGATOIRE — indépendance, incompatibilités et lettre de mission', () => {
    const a = DILIGENCES.find(d => d.id === 'acceptation');
    for(const sujet of [/lettre de mission/i, /incompatibilité/i, /indépendance/i, /durée du mandat/i])
        assert.ok(a.points.some(p => sujet.test(p.q)), `point manquant : ${sujet}`);
});

/* ---------------- Rendu et installation ---------------- */

test('RENDU — chaque type de saisie produit un champ exploitable', () => {
    const html = t => S.diliChampHtml(t, 'fraude');
    assert.match(html('oui'),   /<select[\s\S]*Oui[\s\S]*Non[\s\S]*N\/A/);
    assert.match(html('date'),  /type="date"/);
    assert.match(html('zone'),  /<textarea/);
    assert.match(html('texte'), /type="text"/);
    // Les champs de texte ne doivent pas être pris pour des montants et
    // reformatés avec des séparateurs de milliers par le module 28.
    assert.match(html('texte'), /data-fmt="non"/);
    assert.match(html('nom'),   /data-fmt="non"/);
});

test('RENDU — le panneau porte la base normative et une ligne par point', () => {
    for(const d of DILIGENCES){
        const h = S.diliPanneauHtml(d);
        assert.ok(h.includes('data-tab="' + d.id + '"'),
            `${d.id} : la carte doit porter data-tab, sinon l’onglet n’est pas sauvegardé`);
        assert.ok(h.includes('Base normative'), `${d.id} : base normative absente du rendu`);
        const lignes = (h.match(/<tr>/g) || []).length;
        assert.equal(lignes, d.points.length + 1, `${d.id} : ${lignes - 1} lignes pour ${d.points.length} points`);
        assert.ok(h.includes('Conclusion de la section'), `${d.id} : conclusion absente`);
    }
});

test('RENDU — le HTML produit échappe les guillemets des libellés', () => {
    // Les questions contiennent des apostrophes typographiques et des
    // guillemets français ; un échappement manquant casserait l'attribut.
    const h = S.diliPanneauHtml(DILIGENCES.find(d => d.id === 'continuite'));
    assert.ok(!/<td>[^<]*"[^<]*<\/td>/.test(h.replace(/&quot;/g, '')),
        'guillemet non échappé dans une cellule');
});

test('INSTALLATION — chaque section est déclarée dans TABS avec sa phase', () => {
    // Sans cette déclaration, l'onglet s'affiche mais n'est jamais
    // sauvegardé : la saisie de l'auditeur serait perdue au rechargement.
    const TABS = local(S.TABS);
    for(const d of DILIGENCES){
        const t = TABS.find(x => x.id === d.id);
        assert.ok(t, `${d.id} absent de TABS — l’onglet ne serait pas sauvegardé`);
        assert.equal(t.phase, d.phase);
        assert.ok(t.label.includes(d.titre), `${d.id} : libellé « ${t.label} »`);
    }
});

test('INSTALLATION — poser les onglets deux fois n’en crée pas le double', () => {
    const avant = local(S.TABS).length;
    S.diliInstaller();
    S.diliInstaller();
    assert.equal(local(S.TABS).length, avant, 'TABS a grossi à la seconde installation');
});
