/* ==================================================================
   FAITS MARQUANTS ET RATTACHEMENT DU PROGRAMME AUX ASSERTIONS

   Deux automatismes qui doivent surtout ne pas mentir :

   · le rattachement d'une étape de programme à une assertion est une
     PROPOSITION, déduite de règles explicites ; une étape que rien ne
     rattache doit rester visiblement vide plutôt que recevoir une
     assertion approximative ;

   · les faits marquants sont rassemblés depuis ce que l'application
     calcule déjà. Un faux bloquant ferait douter de tout le reste ;
     un bloquant manqué laisserait conclure à tort.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/* ---------------- Programme → assertions ---------------- */

test('PROGRAMME — les règles ne produisent que des codes d’assertion connus', () => {
    const connus = new Set(local(S.ASSERTIONS).map(a => a.code));
    const fautes = [];
    for(const r of local(S.PROG_REGLES)){
        if(!r.a || !r.a.length) fautes.push(`règle sans assertion : ${r.p}`);
        if(!r.p) fautes.push('règle sans explication');
        for(const c of r.a || [])
            if(!connus.has(c)) fautes.push(`assertion inconnue « ${c} » dans « ${r.p} »`);
    }
    assert.deepEqual(fautes, []);
});

test('PROGRAMME — les verbes d’audit se rattachent à l’assertion attendue', () => {
    const cas = [
        ["Sélectionner un échantillon et effectuer un inventaire physique", 'S_EXI'],
        ["Adresser des demandes de confirmation de soldes aux clients", 'S_DRO'],
        ["S'assurer que toutes les charges engagées sont bien comptabilisées", 'F_EXH'],
        ["Vérifier la date de livraison mentionnée sur les factures", 'F_CUT'],
        ["Vérifier la comptabilisation des provisions pour dépréciation", 'S_EVA'],
        ["Vérifier que les créances sont bien classées en court terme ou long terme", 'F_CLA'],
        ["S'assurer que les garanties données figurent en annexes", 'P_EXH'],
        ["Comparer le capital social avec le RCCM et le registre des actionnaires", 'S_DRO'],
        ["Recalculer les dotations aux amortissements", 'F_MES'],
    ];
    for(const [texte, attendu] of cas){
        const r = S.progAssertions(texte);
        assert.ok(r.codes.includes(attendu),
            `« ${texte} » → ${r.codes.join(',') || 'rien'} (attendu : ${attendu})`);
    }
});

test('PROGRAMME — une étape de conclusion ne reçoit aucune assertion', () => {
    // Formuler une recommandation n'est pas un test de substance : lui
    // attribuer une assertion serait faux.
    for(const t of ["Formuler des recommandations, conclure et proposer des écritures de régularisation",
                    "Proposer des ajustements et des écritures de régularisation"]){
        const r = S.progAssertions(t);
        assert.equal(r.conclusion, true, `« ${t} » devrait être une étape de conclusion`);
        assert.deepEqual(local(r.codes), []);
    }
});

test('PROGRAMME — une procédure inconnue reste vide, sans rattachement inventé', () => {
    const r = S.progAssertions("Prendre un café avec le directeur financier");
    assert.deepEqual(local(r.codes), []);
    assert.equal(r.conclusion, false);
});

test('PROGRAMME — les assertions sont ordonnées flux, soldes, présentation', () => {
    const t = local(S.progTrier(['P_EXH', 'S_EXI', 'F_CUT', 'S_EVA']));
    assert.deepEqual(t, ['F_CUT', 'S_EVA', 'S_EXI', 'P_EXH']);
});

/* ---------------- Faits marquants ---------------- */

test('FAITS — les trois degrés sont ordonnés du plus grave au moins grave', () => {
    const d = local(S.FM_DEGRES);
    assert.ok(d.BLOQUANT.o < d.MAJEUR.o);
    assert.ok(d.MAJEUR.o < d['SIGNALÉ'].o);
});

test('FAITS — MTTCI ne produit aucun bloquant : la balance boucle', () => {
    // C'est la propriété qui rend le module crédible. Un faux bloquant
    // sur un jeu de référence sain discréditerait tous les autres.
    const F = local(S.fmCollecter());
    const bloquants = F.filter(f => f.degre === 'BLOQUANT');
    assert.deepEqual(bloquants.map(f => f.source + ' — ' + f.libelle), []);
});

test('FAITS — MTTCI remonte ses défauts connus, et pas d’autres', () => {
    const F = local(S.fmCollecter());
    const texte = JSON.stringify(F);
    // fmt() sépare les milliers par des espaces fines insécables : un motif
    // écrit avec des espaces ordinaires ne correspondrait jamais.
    const sansEspace = s => String(s).replace(/[^\d-]/g, '');
    assert.ok(F.some(f => /Mouvements déséquilibrés/.test(f.libelle)
                       && sansEspace(f.libelle).includes('-22291540')),
        'le déséquilibre des mouvements N-1 doit remonter');
    assert.match(texte, /numéroté\(s\) de deux façons/,
        'la numérotation hétérogène doit remonter');
    assert.match(texte, /incohérence\(s\) d’intitulé/,
        'les doublons d’intitulé doivent remonter');
    assert.ok(F.length >= 3 && F.length <= 12,
        `${F.length} faits : ni silence suspect, ni bruit ingérable`);
});

test('FAITS — chaque fait nomme sa source et porte un degré valide', () => {
    for(const f of local(S.fmCollecter())){
        assert.ok(['BLOQUANT', 'MAJEUR', 'SIGNALÉ'].includes(f.degre), `degré « ${f.degre} »`);
        assert.ok(f.source && f.source.length > 2, 'source manquante');
        assert.ok(f.libelle && f.libelle.length > 8, `libellé trop court : ${f.libelle}`);
    }
});

test('FAITS — un bilan déséquilibré remonte en BLOQUANT', () => {
    // Vérification par l'absurde : sur une balance volontairement fausse,
    // le fait bloquant doit apparaître.
    const sauvegarde = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({
            n:  [{ compte:'52110000', intitule:'BANQUE', od:0, oc:0, md:0, mc:0, sd:1000, sc:0 }],
            n1: [],
        });
        const F = local(S.fmCollecter());
        const b = F.filter(f => f.degre === 'BLOQUANT');
        assert.ok(b.length, 'aucun bloquant sur une balance déséquilibrée');
        assert.match(JSON.stringify(b), /Soldes déséquilibrés|Actif et passif/);
    } finally {
        app.chargerBalances(JSON.parse(sauvegarde));
    }
});

test('FAITS — sans balance chargée, aucun fait d’équilibre n’est inventé', () => {
    const sauvegarde = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({ n: [], n1: [] });
        const F = local(S.fmCollecter());
        assert.ok(!F.some(f => /déséquilibr|ne se rejoignent/.test(f.libelle)),
            'un dossier vide ne doit pas signaler de déséquilibre');
    } finally {
        app.chargerBalances(JSON.parse(sauvegarde));
    }
});

test('FAITS — les faits sont rendus dans l’ordre de gravité', () => {
    const F = local(S.fmCollecter());
    const rang = { BLOQUANT:1, MAJEUR:2, 'SIGNALÉ':3 };
    for(let i = 1; i < F.length; i++)
        assert.ok(rang[F[i-1].degre] <= rang[F[i].degre], `ordre rompu à la ligne ${i}`);
});

test('FAITS — la ligne rendue distingue l’origine automatique de la saisie', () => {
    // La régénération ne retire que les lignes « auto » : sans cette
    // distinction, elle effacerait les faits ajoutés par l'auditeur.
    const f = { degre:'MAJEUR', source:'Test', libelle:'Un fait', incidence:'Une incidence' };
    assert.match(S.fmLigneHtml(f, true),  />auto</);
    assert.match(S.fmLigneHtml(f, false), />saisi</);
});

test('CONSTATATIONS — l’onglet est déclaré dans TABS pour être sauvegardé', () => {
    const t = local(S.TABS).find(x => x.id === 'constatations');
    assert.ok(t, 'onglet absent de TABS — la saisie serait perdue au rechargement');
    assert.equal(t.phase, 3);
});
