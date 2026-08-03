/* ==================================================================
   ANALYSE PAR CYCLE COMPTABLE — §4 et §5 de Détection des erreurs

   Onze cycles, sept tests par sous-compte, des rapprochements croisés
   par cycle, puis l'analyse de risque qui alimente le mémo de synthèse.

   Les rapprochements bloquants sortent à écart nul sur MTTCI : c'est
   la propriété qui donne sa valeur au jeu de référence, et ce que ces
   tests protègent.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();

const ev = code => app.evaluer(code);
const CYCLES = app.sandbox.CYCLES;

/* Les tests par compte reçoivent un seuil ; à 1 franc, aucune anomalie
   n'est masquée par arrondi. */
const SEUIL = 1;
const testsSur = (r, r1, cycId) =>
    app.sandbox.cycTestsCompte(r, r1, SEUIL, cycId, {});
const codes = anos => anos.map(a => a.t.split(' ')[0]);

/* ---------------- Rattachement des comptes aux cycles ---------------- */

test('RATTACHEMENT — le préfixe déclaré le plus long l’emporte', () => {
    // '3' rattache les stocks au cycle STK, mais '603' — plus long —
    // y rattache aussi la variation de stocks, qui commence par 6.
    assert.equal(ev(`cycleOf('31100000')`), 'STK', 'stock');
    assert.equal(ev(`cycleOf('60310000')`), 'STK', 'variation de stocks : 603 bat 6');
    assert.equal(ev(`cycleOf('60110000')`), 'ACH', 'achats de marchandises');
    assert.equal(ev(`cycleOf('41100000')`), 'VTE');
    assert.equal(ev(`cycleOf('40100000')`), 'ACH');
    assert.equal(ev(`cycleOf('52110000')`), 'TRE');
    assert.equal(ev(`cycleOf('10180000')`), 'CAP');
    assert.equal(ev(`cycleOf('28400000')`), 'IMM');
    assert.equal(ev(`cycleOf('47100000')`), 'REG');
    assert.equal(ev(`cycleOf('89000000')`), 'FIS', 'impôt sur le résultat');
});

test('RATTACHEMENT — un compte sans numéro exploitable n’est rattaché à rien', () => {
    for(const c of ['', '   ', 'TOTAL', null, undefined])
        assert.equal(ev(`cycleOf(${JSON.stringify(c ?? null)})`), null, `« ${c} »`);
});

test('COUVERTURE — tout compte de la balance MTTCI trouve son cycle', () => {
    // Un compte orphelin disparaîtrait silencieusement de l'analyse :
    // l'auditeur ne le verrait dans aucun tableau.
    const orphelins = ev(`
        (balanceData.n.concat(balanceData.n1))
            .filter(function(r){ return !cycleOf(r.compte); })
            .map(function(r){ return r.compte + ' ' + r.intitule; })
    `);
    assert.deepEqual(orphelins, [], 'comptes rattachés à aucun cycle');
});

test('COUVERTURE — les onze cycles sont déclarés sans doublon d’identifiant', () => {
    assert.equal(CYCLES.length, 11);
    const ids = CYCLES.map(c => c.id);
    assert.equal(new Set(ids).size, 11, 'identifiant de cycle en double');
    for(const c of CYCLES)
        assert.ok(c.pfx.length && c.nom && c.ico, `cycle ${c.id} incomplet`);
});

/* ---------------- Les sept tests par sous-compte ---------------- */

test('T1 — ouverture plus mouvements différents du solde de clôture', () => {
    const bancal = { compte:'40110000', intitule:'FOURNISSEUR', od:0, oc:1000, md:0, mc:500, sd:0, sc:9999 };
    assert.ok(codes(testsSur(bancal, null, 'ACH')).includes('T1'));

    // ouverture 1000 C + mouvement 500 C = 1500 C : cohérent
    const juste = { compte:'40110000', intitule:'FOURNISSEUR', od:0, oc:1000, md:0, mc:500, sd:0, sc:1500 };
    assert.ok(!codes(testsSur(juste, null, 'ACH')).includes('T1'));
});

test('T2 — rupture de continuité entre clôture N-1 et ouverture N', () => {
    const n1 = { compte:'21310000', od:0, oc:0, md:0, mc:0, sd:500000, sc:0 };
    const n  = { compte:'21310000', od:450000, oc:0, md:0, mc:0, sd:450000, sc:0 };
    const anos = testsSur(n, n1, 'IMM');
    const t2 = anos.find(a => a.t.startsWith('T2'));
    assert.ok(t2, 'rupture non détectée');
    assert.equal(t2.g, 'CRITIQUE');
});

test('T2 et T4 — les comptes 11, 12 et 13 sont ramenés à MINEUR', () => {
    // Leur variation aux à-nouveaux vient de l'affectation du résultat :
    // ce n'est pas une rupture de continuité, mais ça reste à rapprocher
    // du PV d'assemblée.
    const n1 = { compte:'12100000', od:0, oc:0, md:0, mc:0, sd:0, sc:5000000 };
    const n  = { compte:'12100000', od:0, oc:17291540, md:0, mc:0, sd:0, sc:17291540 };
    const anos = testsSur(n, n1, 'CAP');
    const t2 = anos.find(a => a.t.startsWith('T2'));
    assert.ok(t2, 'T2 attendu');
    assert.equal(t2.g, 'MINEUR', 'l’affectation du résultat ne doit pas sortir en CRITIQUE');
    assert.match(t2.d, /affectation du résultat/i);

    // le même écart sur un compte ordinaire reste CRITIQUE
    const autre = { compte:'40110000', od:0, oc:17291540, md:0, mc:0, sd:0, sc:17291540 };
    const autreN1 = { compte:'40110000', od:0, oc:0, md:0, mc:0, sd:0, sc:5000000 };
    assert.equal(testsSur(autre, autreN1, 'ACH').find(a => a.t.startsWith('T2')).g, 'CRITIQUE');
});

test('T4 — solde qui varie sans aucun mouvement de l’exercice', () => {
    const n1 = { compte:'40110000', od:0, oc:0, md:0, mc:0, sd:0, sc:1000000 };
    const n  = { compte:'40110000', od:0, oc:2000000, md:0, mc:0, sd:0, sc:2000000 };
    const t4 = testsSur(n, n1, 'ACH').find(a => a.t.startsWith('T4'));
    assert.ok(t4, 'variation sans mouvement non détectée');
    assert.equal(t4.g, 'CRITIQUE');
});

test('T5 — compte nouveau, absent de la balance N-1', () => {
    const nouveau = { compte:'27580000', od:0, oc:0, md:100000000, mc:0, sd:100000000, sc:0 };
    const t5 = testsSur(nouveau, null, 'IMM').find(a => a.t.startsWith('T5'));
    assert.ok(t5);
    assert.equal(t5.g, 'MINEUR');
});

test('T6 — les reclassements propres à chaque cycle', () => {
    const cas = [
        ['40910000', 'ACH', { sd:300000, sc:0 }, /reclasser à l’actif en BH/i, 'fournisseur débiteur'],
        ['41810000', 'VTE', { sd:0, sc:113822444 }, /reclasser au passif en DI/i, 'client créditeur'],
        ['42100000', 'PER', { sd:500000, sc:0 }, /avance ou acompte/i, 'personnel débiteur'],
        ['44500000', 'FIS', { sd:800000, sc:0 }, /crédit de TVA|reclassement à l’actif/i, 'État débiteur'],
        ['52110000', 'TRE', { sd:0, sc:400000 }, /trésorerie-passif DR/i, 'banque créditrice'],
        ['47100000', 'REG', { sd:250000, sc:0 }, /apurer avant arrêté/i, 'compte d’attente'],
    ];
    for(const [compte, cyc, soldes, motif, quoi] of cas){
        const r = Object.assign({ compte, od:0, oc:0, md:0, mc:0 }, soldes);
        const t6 = testsSur(r, null, cyc).find(a => a.t.startsWith('T6'));
        assert.ok(t6, `${quoi} : T6 attendu`);
        assert.match(t6.d, motif, quoi);
    }
});

test('T6 — une caisse créditrice est matériellement impossible', () => {
    const caisse = { compte:'57100000', od:0, oc:0, md:0, mc:0, sd:0, sc:50000 };
    const t6 = testsSur(caisse, null, 'TRE').find(a => a.t.startsWith('T6'));
    assert.ok(t6);
    assert.equal(t6.g, 'CRITIQUE', 'une caisse négative n’est pas un simple reclassement');
});

test('T6 — un amortissement ne peut pas dépasser la valeur brute', () => {
    // 2451 matériel de transport : brut 62 132 484 sur MTTCI.
    const excessif = { compte:'28450000', od:0, oc:0, md:0, mc:0, sd:0, sc:999999999 };
    const t6 = testsSur(excessif, null, 'IMM').find(a => a.t.startsWith('T6'));
    assert.ok(t6, 'sur-amortissement non détecté');
    assert.equal(t6.g, 'CRITIQUE');

    const normal = { compte:'28450000', od:0, oc:0, md:0, mc:0, sd:0, sc:8695525 };
    assert.ok(!codes(testsSur(normal, null, 'IMM')).includes('T6'),
        'l’amortissement réel de MTTCI ne doit pas être signalé');
});

test('T7 — compte soldé en N-1 et absent de la balance N', () => {
    const disparus = app.sandbox.cycDisparus('ACH', {}, [
        { compte:'40120000', intitule:'FOURNISSEUR X', od:0, oc:0, md:0, mc:0, sd:0, sc:3000000 },
        { compte:'40130000', intitule:'FOURNISSEUR Y', od:0, oc:0, md:0, mc:0, sd:0, sc:0 },
    ], SEUIL);
    assert.equal(disparus.length, 1, 'seul le compte au solde non nul doit sortir');
    assert.equal(disparus[0].compte, '40120000');
    assert.equal(disparus[0].anos[0].g, 'MAJEUR');
});

/* ---------------- Rapprochements croisés par cycle ---------------- */

test('CONTRÔLES CROISÉS — les trois bloquants sortent à écart nul sur MTTCI', () => {
    // Ce sont eux qui font de MTTCI un jeu de référence exploitable.
    const attendus = {
        IMM: /dotations aux amortissements/i,
        CAP: /report à nouveau/i,
        TRE: /trésorerie/i,
    };
    for(const [cycId, motif] of Object.entries(attendus)){
        const ctrls = app.sandbox.cycControlesGlobaux(cycId).filter(c => !c.info);
        assert.ok(ctrls.length, `${cycId} : aucun contrôle bloquant`);
        const c = ctrls.find(x => motif.test(x.lib));
        assert.ok(c, `${cycId} : contrôle « ${motif} » introuvable`);
        assert.equal(arrondi(c.a), arrondi(c.b),
            `${cycId} — ${c.lib} : ${arrondi(c.a)} contre ${arrondi(c.b)}`);
    }
});

test('CONTRÔLES CROISÉS — la trésorerie recoupe ZG du tableau des flux', () => {
    const c = app.sandbox.cycControlesGlobaux('TRE').find(x => !x.info);
    assert.equal(arrondi(c.b), arrondi(ev('liasseGetTFTColumn("n").ZG')));
    assert.equal(arrondi(c.a), arrondi(c.b));
});

test('CONTRÔLES CROISÉS — le report à nouveau recoupe le résultat net N-1', () => {
    const c = app.sandbox.cycControlesGlobaux('CAP').find(x => !x.info);
    assert.equal(arrondi(c.b), REF.resultat.XI[1], 'la référence est le résultat DGI N-1');
    assert.equal(arrondi(c.a), arrondi(c.b));
});

/* ---------------- Analyse de risque et mémo ---------------- */

test('RISQUE — chaque cycle présent reçoit une note cohérente avec son score', () => {
    const analyse = app.sandbox.memoAnalyseCycles();
    assert.ok(analyse.length, 'aucun cycle analysé');

    for(const c of analyse){
        assert.ok(['ÉLEVÉ', 'MOYEN', 'FAIBLE'].includes(c.risque), `${c.id} : risque « ${c.risque} »`);
        // le barème doit rester celui que le mémo commente
        const attendu = c.score >= 5 ? 'ÉLEVÉ' : (c.score >= 2 ? 'MOYEN' : 'FAIBLE');
        assert.equal(c.risque, attendu, `${c.id} : score ${c.score}`);
        assert.ok(c.poids >= 0 && c.poids <= 100, `${c.id} : poids ${c.poids}`);
        assert.ok(c.avancement >= 0 && c.avancement <= 100, `${c.id} : avancement ${c.avancement}`);
        assert.ok(c.comptes > 0);
    }
});

test('RISQUE — les cycles sont classés du plus risqué au moins risqué', () => {
    const analyse = app.sandbox.memoAnalyseCycles();
    for(let i = 1; i < analyse.length; i++)
        assert.ok(analyse[i-1].score >= analyse[i].score,
            `classement rompu entre ${analyse[i-1].id} et ${analyse[i].id}`);
});

test('RISQUE — un cycle sans anomalie est réputé achevé', () => {
    // L'avancement se déduit des commentaires saisis en §5 ; un cycle
    // sans anomalie n'attend aucun commentaire, il est donc à 100 %.
    const analyse = app.sandbox.memoAnalyseCycles();
    for(const c of analyse)
        if(c.comptesAno === 0)
            assert.equal(c.avancement, 100, `${c.id} : sans anomalie mais avancement ${c.avancement}`);
});

test('RISQUE — la somme des poids couvre l’intégralité de la balance', () => {
    const analyse = app.sandbox.memoAnalyseCycles();
    const total = analyse.reduce((s, c) => s + c.poids, 0);
    assert.ok(Math.abs(total - 100) < 0.01, `somme des poids = ${total} %`);
});

/* ---------------- Revue des variations (§5) ---------------- */

test('VARIATIONS — les doublons de numéro de compte sont signalés, non rapprochés', () => {
    // 63280000 et 658800000 figurent deux fois dans la balance N de MTTCI.
    // Sans lever l'ambiguïté, aucun rapprochement N-1 n'est possible.
    const occ = ev(`cycOccurrences(balanceData.n)`);
    assert.ok(occ['63280000'] >= 2, 'le doublon 63280000 doit être compté');
    assert.ok(occ['658800000'] >= 2, 'le doublon 658800000 doit être compté');
});

test('VARIATIONS — un compte non rattaché ne doit porter aucun solde', () => {
    // cycPosteLiasse rend un fragment HTML : la référence du poste, suivie
    // le cas échéant de la colonne (brut / amort.). Un compte que le moteur
    // ne sait pas rattacher rend « — » : sa variation est inexploitable pour
    // l'auditeur, et surtout son solde n'entre dans AUCUN poste du bilan.
    //
    // Sur MTTCI, seul 585 « Virements de fonds » est dans ce cas, et c'est
    // légitime : un compte de virement interne n'a pas de poste de liasse,
    // il doit être soldé à la clôture. Ses 6,4 milliards de mouvements
    // s'annulent exactement.
    //
    // L'invariant à tenir n'est donc pas « tout compte est rattaché », mais
    // « tout compte non rattaché est soldé ». Un 585 non soldé — virement en
    // transit au 31/12 — ferait diverger la trésorerie de la balance et celle
    // de la liasse, sans que rien ne le signale.
    const fautifs = ev(`
        balanceData.n.filter(function(r){
            return String(cycPosteLiasse(r)).indexOf('—') === 0 && Math.abs(cycSolde(r)) > 1;
        }).map(function(r){ return r.compte + ' ' + r.intitule + ' : ' + cycSolde(r); })
    `);
    assert.deepEqual(fautifs, [], 'compte non rattaché portant un solde — il sort du bilan sans trace');
});

test('VARIATIONS — la trésorerie de la balance égale celle de la liasse', () => {
    // Corollaire du test précédent : 585 étant soldé, la classe 5 de la
    // balance et le poste BS de la liasse coïncident.
    assert.equal(arrondi(ev(`cycSumPfx('n', ['5'], 'solde')`)),
                 arrondi(ev('liasseGetActif("n").BS.net')));
});

test('VARIATIONS — le poste rendu est celui que le moteur retient', () => {
    // La colonne doit suivre paramResolve : c'est le même rattachement qui
    // alimente la liasse, sinon §5 commenterait un poste et la liasse un autre.
    const cas = [
        ['41810000', 0, 113822444, /^DI/,          'client créditeur → DI'],
        ['40910000', 300000, 0,    /^BH/,          'fournisseur débiteur → BH'],
        ['21310000', 450000, 0,    /^AF.*brut/,    'logiciels → AF, colonne brut'],
        ['28130000', 0, 180000,    /^AF.*amort/,   'amortissement des logiciels → AF, colonne amort.'],
    ];
    for(const [compte, sd, sc, motif, quoi] of cas){
        const rendu = ev(`cycPosteLiasse({compte:'${compte}', sd:${sd}, sc:${sc}})`);
        assert.match(rendu, motif, `${quoi} — rendu « ${rendu} »`);
    }
});
