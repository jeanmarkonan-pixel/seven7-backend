/* ==================================================================
   REVUE ANALYTIQUE — DÉTAIL DES COMPTES PAR GRANDE MASSE

   La propriété qui rend ce détail exploitable : le total des comptes
   d'une masse ÉGALE la masse elle-même, telle que la liasse DGI
   l'affiche. Un détail qui ne recoupe pas ce qu'il explique conduirait
   l'auditeur à chercher une variation sur des comptes incomplets.

   Deux pièges ont été rencontrés en construisant le module :
     · exclure les comptes d'amortissement laissait un écart égal aux
       amortissements cumulés (14 686 982 sur MTTCI) ;
     · les capitaux propres manquaient le résultat de l'exercice
       (5 770 774), qui n'est pas un compte de balance.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/* masse → [réf de liasse, côté du bilan] */
const MASSES = {
    ai: ['AZ', 'actif'],  ac: ['BK', 'actif'],  ta: ['BT', 'actif'],
    cp: ['CP', 'passif'], df: ['DD', 'passif'], pc: ['DP', 'passif'],
};
/* Le détail somme sd − sc : au passif, la masse est l'opposé. */
const versMasse = (cote, v) => cote === 'actif' ? v : -v;
const attendu = (ref, cote, ex) => cote === 'actif'
    ? REF.actif[ref][ex === 'n' ? 2 : 3]
    : REF.passif[ref][ex === 'n' ? 0 : 1];

test('RECOUPEMENT — chaque grande masse égale la somme de son détail, en N', () => {
    for(const [cle, [ref, cote]] of Object.entries(MASSES)){
        const t = local(S.rvdTotaux(cle));
        assert.equal(arrondi(versMasse(cote, t.n)), attendu(ref, cote, 'n'),
            `${cle} (${ref}) — le détail ne recoupe pas la masse`);
    }
});

test('RECOUPEMENT — chaque grande masse égale la somme de son détail, en N-1', () => {
    for(const [cle, [ref, cote]] of Object.entries(MASSES)){
        const t = local(S.rvdTotaux(cle));
        assert.equal(arrondi(versMasse(cote, t.n1)), attendu(ref, cote, 'n1'),
            `${cle} (${ref}) — le détail N-1 ne recoupe pas la masse`);
    }
});

test('RÉGRESSION — les amortissements entrent dans le détail de l’actif immobilisé', () => {
    // Les exclure donnait le brut (188 379 081) au lieu du net (173 692 099).
    const d = local(S.rvdDetail('ai'));
    const amorts = d.filter(a => /^28/.test(a.compte));
    assert.ok(amorts.length, 'aucun compte d’amortissement rattaché à l’actif immobilisé');
    const cumul = amorts.reduce((s, a) => s + a.n, 0);
    assert.equal(arrondi(-cumul), REF.actif.AZ[1],
        'le cumul des amortissements doit égaler la colonne amortissements de AZ');
    assert.equal(arrondi(local(S.rvdTotaux('ai')).n), REF.actif.AZ[2], 'le total doit être le NET');
});

test('RÉGRESSION — le résultat de l’exercice figure au détail des capitaux propres', () => {
    // Ce n'est pas un compte de balance : sans ligne calculée, il manquait.
    const d = local(S.rvdDetail('cp'));
    const res = d.find(a => a.calcule);
    assert.ok(res, 'ligne de résultat absente du détail des capitaux propres');
    assert.equal(res.poste, 'CJ');
    assert.equal(arrondi(-res.n),  REF.resultat.XI[0], 'résultat N');
    assert.equal(arrondi(-res.n1), REF.resultat.XI[1], 'résultat N-1');
});

test('DÉTAIL — chaque ligne porte son poste de liasse et son intitulé', () => {
    for(const cle of Object.keys(MASSES))
        for(const a of local(S.rvdDetail(cle))){
            assert.ok(a.compte, `${cle} : ligne sans numéro de compte`);
            assert.ok(a.poste,  `${cle} : ${a.compte} sans poste de liasse`);
            if(!a.calcule) assert.ok(a.intitule, `${cle} : ${a.compte} sans intitulé`);
        }
});

test('DÉTAIL — la variation et le pourcentage sont cohérents', () => {
    for(const cle of Object.keys(MASSES))
        for(const a of local(S.rvdDetail(cle))){
            assert.equal(arrondi(a.variation), arrondi(a.n - a.n1),
                `${cle} / ${a.compte} : variation incohérente`);
            const pct = a.n1 !== 0 ? ((a.n - a.n1) / Math.abs(a.n1)) * 100 : (a.n !== 0 ? 100 : 0);
            if(!a.calcule)
                assert.ok(Math.abs(a.pct - pct) < 0.01, `${cle} / ${a.compte} : pourcentage incohérent`);
        }
});

test('DÉTAIL — les comptes sont classés par variation décroissante', () => {
    // L'auditeur doit voir en tête le compte qui explique le plus.
    for(const cle of Object.keys(MASSES)){
        const d = local(S.rvdDetail(cle));
        for(let i = 1; i < d.length; i++)
            assert.ok(Math.abs(d[i-1].variation) >= Math.abs(d[i].variation),
                `${cle} : classement rompu à la ligne ${i}`);
    }
});

test('DÉTAIL — le poids de chaque compte dans la variation totalise 100 %', () => {
    for(const cle of Object.keys(MASSES)){
        const d = local(S.rvdDetail(cle));
        if(!d.length || !d.some(a => a.variation !== 0)) continue;
        const somme = d.reduce((s, a) => s + (a.poids || 0), 0);
        assert.ok(Math.abs(somme - 100) < 0.5, `${cle} : somme des poids = ${somme.toFixed(1)} %`);
    }
});

test('BASCULE — un compte qui change de sens change de masse, et c’est signalé', () => {
    // Cinq comptes de MTTCI basculent : État et comptes courants d'associés,
    // créditeurs en N-1 (passif circulant) et débiteurs en N (actif circulant).
    // Chaque masse ne porte que le montant qui lui revient — c'est ce qui
    // permet aux deux de recouper — mais la variation lue dans l'une paraîtrait
    // aberrante sans le signalement.
    const parCompte = {};
    for(const cle of Object.keys(MASSES))
        for(const a of local(S.rvdDetail(cle))){
            if(a.calcule) continue;
            (parCompte[a.compte] = parCompte[a.compte] || []).push({ cle, a });
        }
    const doubles = Object.entries(parCompte).filter(([, l]) => l.length > 1);
    assert.ok(doubles.length >= 5, `${doubles.length} bascule(s) détectée(s), au moins 5 attendues`);
    for(const [compte, l] of doubles)
        for(const { cle, a } of l)
            assert.ok(a.bascule, `${compte} présent dans ${cle} sans marqueur de bascule`);
});

test('COUVERTURE — le détail utilise le même moteur que la liasse', () => {
    // rvdMasseDe passe par paramResolve : le détail ne peut donc pas
    // diverger du rattachement qui produit la liasse elle-même.
    assert.equal(S.rvdMasseDe('41810000', 0, 113822444), 'pc',
        'un client créditeur part au passif circulant en DI, pas à l’actif');
    assert.equal(S.rvdMasseDe('40910000', 300000, 0), 'ac',
        'un fournisseur débiteur rejoint l’actif circulant en BH');
    assert.equal(S.rvdMasseDe('52110000', 5000000, 0), 'ta');
    assert.equal(S.rvdMasseDe('21310000', 450000, 0), 'ai');
});

test('COUVERTURE — les six masses du tableau des grandes masses sont détaillées', () => {
    const declarees = local(S.RVD_MASSES).map(m => m.cle);
    assert.deepEqual(declarees.sort(), Object.keys(MASSES).sort());
    for(const m of local(S.RVD_MASSES)){
        assert.ok(m.lib && m.refs.length, `masse ${m.cle} incomplète`);
        assert.ok(['actif', 'passif'].includes(m.cote));
    }
});

test('DÉTAIL — sans balance chargée, le calcul ne casse pas', () => {
    const sauve = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({ n: [], n1: [] });
        for(const cle of Object.keys(MASSES)){
            const t = local(S.rvdTotaux(cle));
            assert.equal(t.comptes, 0, `${cle} : détail non vide sur balance vide`);
        }
    } finally {
        app.chargerBalances(JSON.parse(sauve));
    }
});
