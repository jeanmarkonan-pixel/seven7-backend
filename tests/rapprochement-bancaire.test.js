/* ==================================================================
   RAPPROCHEMENT BANCAIRE — moteur de parsing et de rapprochement
   automatique (51-rapprochement-bancaire.js)

   Ces tests couvrent les fonctions PURES (parsing, matching, proposition
   d'écriture) sans DOM, sur le même principe que cycles.test.js. La
   règle qui donne sa valeur à cette suite : « zéro erreur silencieuse »
   — une ligne illisible doit être rejetée et listée, jamais ignorée ;
   une correspondance ambiguë ne doit jamais être choisie seule par le
   moteur, dans un sens comme dans l'autre (un relevé avec plusieurs
   candidats GL, ou un GL réclamé par plusieurs lignes de relevé).
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication } from './harness.js';

const app = chargerApplication();
const ev = code => app.evaluer(code);

/* ---------------- Parsing de date ---------------- */

test('DATE — formats courants (ISO, JJ/MM/AAAA, JJ/MM/AA) et rejet des dates invalides', () => {
    assert.equal(ev(`rbParserDate('2025-11-05')`), '2025-11-05');
    assert.equal(ev(`rbParserDate('05/11/2025')`), '2025-11-05');
    assert.equal(ev(`rbParserDate('05/11/25')`), '2025-11-05');
    assert.equal(ev(`rbParserDate('5/1/2025')`), '2025-01-05');
    assert.equal(ev(`rbParserDate('05-11-2025')`), '2025-11-05');
    assert.equal(ev(`rbParserDate('')`), null);
    assert.equal(ev(`rbParserDate('n/a')`), null);
    assert.equal(ev(`rbParserDate(undefined)`), null);
});

/* ---------------- Parsing des lignes importées ---------------- */

test('LIGNES — en-tête Débit/Crédit reconnu, ligne illisible rejetée et listée (jamais ignorée)', () => {
    const cellules = [
        ['Date', 'Libellé', 'Référence', 'Débit', 'Crédit'],
        ['05/11/2025', 'VIREMENT CLIENT', 'VIR001', '', '250 000'],
        ['06/11/2025', 'FRAIS TENUE COMPTE', '', '5000', ''],
        ['XX/XX/XXXX', 'LIGNE ILLISIBLE', '', '', '1000']
    ];
    const res = ev(`rbParserLignesCellules(${JSON.stringify(cellules)})`);
    assert.equal(res.erreurEntete, false);
    assert.equal(res.lignes.length, 2, 'deux lignes valides');
    assert.equal(res.rejets.length, 1, 'la ligne à date illisible doit être rejetée, pas ignorée');
    assert.equal(res.rejets[0].ligne, 4);
    assert.equal(res.lignes[0].credit, 250000, 'espace insécable/normale comme séparateur de milliers');
    assert.equal(res.lignes[1].debit, 5000);
});

test('LIGNES — colonne Montant unique signée (positif = crédit, négatif = débit)', () => {
    const cellules = [
        ['Date', 'Libelle', 'Montant'],
        ['10/12/2025', 'ENCAISSEMENT', '100000'],
        ['11/12/2025', 'DECAISSEMENT', '-30000']
    ];
    const res = ev(`rbParserLignesCellules(${JSON.stringify(cellules)})`);
    assert.equal(res.lignes.length, 2);
    assert.equal(res.lignes[0].credit, 100000);
    assert.equal(res.lignes[0].debit, 0);
    assert.equal(res.lignes[1].debit, 30000);
    assert.equal(res.lignes[1].credit, 0);
});

test('LIGNES — en-tête précédé de lignes de titre (relevé Banque Atlantique) : la vraie ligne d’en-tête est détectée', () => {
    // Cas réel : un relevé Banque Atlantique commence par 4 lignes de titre
    // (nom de banque, client, n° de compte, période) avant l’en-tête
    // « Date de l'opération | Date Valeur | Référence | Libellé | Montant | Solde ».
    const cellules = [
        ['BANQUE ATLANTIQUE - Relevé de Compte'],
        ['Client : PRO-TRANS AFRICA - 14388087'],
        ['Compte n° : 143880870012 XOF'],
        ['Période : du 01/01/2024 au 17/12/2024'],
        [],
        ["Date de l'opération", 'Date Valeur', 'Référence', 'Libellé', 'Montant', 'Solde'],
        ['17/12/2024', '17/12/2024', 'FT2435248K5Q', 'Paiement Cheque : 0000640', '(2 572 690)', '5 651 603'],
        ['16/12/2024', '16/12/2024', '0082120', 'Commission incident', '-33 000', '8 927 293'],
        ['12/12/2024', '12/12/2024', 'FT24347Q7LFK', 'Remise Cheque', '4 788 417', '8 998 793'],
    ];
    const res = ev(`rbParserLignesCellules(${JSON.stringify(cellules)})`);
    assert.equal(res.erreurEntete, false, 'la ligne d’en-tête réelle doit être trouvée malgré les titres');
    assert.equal(res.lignes.length, 3);
    assert.equal(res.lignes[0].date, '2024-12-17');
    assert.equal(res.lignes[0].debit, 2572690, 'montant négatif entre parenthèses => débit (décaissement)');
    assert.equal(res.lignes[0].credit, 0);
    assert.equal(res.lignes[2].credit, 4788417, 'montant positif => crédit (encaissement)');
    assert.equal(res.lignes[2].debit, 0);
});

test('LIGNES — en-tête non reconnu : erreurEntete=true, jamais un mapping de colonnes deviné en silence', () => {
    const cellules = [ ['Col1', 'Col2', 'Col3'], ['a', 'b', 'c'] ];
    const res = ev(`rbParserLignesCellules(${JSON.stringify(cellules)})`);
    assert.equal(res.erreurEntete, true);
    assert.equal(res.lignes.length, 0);
});

test('LIGNES — lignes vides ignorées silencieusement (légitime : ce ne sont pas des données)', () => {
    const cellules = [
        ['Date', 'Libelle', 'Montant'],
        ['', '', ''],
        ['10/12/2025', 'X', '1000']
    ];
    const res = ev(`rbParserLignesCellules(${JSON.stringify(cellules)})`);
    assert.equal(res.lignes.length, 1);
    assert.equal(res.rejets.length, 0);
});

/* ---------------- Moteur de rapprochement ---------------- */

test('RAPPROCHEMENT — correspondance mutuellement unique => automatique', () => {
    const releve = [{ date:'2025-11-05', libelle:'VIR CLIENT', ref:'', debit:0, credit:250000 }];
    const gl = [{ compte:'521100', date:'2025-11-06', ref:'', libelle:'Vir client', debit:250000, credit:0 }];
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 1);
    assert.equal(res.ambigus.length, 0);
    assert.equal(res.sansCorrespondance.length, 0);
});

test('RAPPROCHEMENT — sens relevé/compta correctement inversé (débit relevé = crédit compta)', () => {
    const releve = [{ date:'2025-11-05', libelle:'PRLV', ref:'', debit:20000, credit:0 }];
    const gl = [{ compte:'521100', date:'2025-11-05', ref:'', libelle:'Prlv', debit:0, credit:20000 }];
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 1);
});

test('RAPPROCHEMENT — deux candidats GL au même montant => ambigu, JAMAIS choisi seul', () => {
    const releve = [{ date:'2025-11-05', libelle:'X', ref:'', debit:0, credit:100000 }];
    const gl = [
        { compte:'521100', date:'2025-11-04', ref:'', libelle:'A', debit:100000, credit:0 },
        { compte:'521100', date:'2025-11-06', ref:'', libelle:'B', debit:100000, credit:0 }
    ];
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 0, 'aucune correspondance ne doit être retenue seule en cas de doute');
    assert.equal(res.ambigus.length, 1);
    assert.equal(res.ambigus[0].candidats.length, 2);
});

test('RAPPROCHEMENT — un même GL réclamé par deux lignes de relevé => ambigu des deux côtés', () => {
    const releve = [
        { date:'2025-11-05', libelle:'X', ref:'', debit:0, credit:75000 },
        { date:'2025-11-06', libelle:'Y', ref:'', debit:0, credit:75000 }
    ];
    const gl = [{ compte:'521100', date:'2025-11-05', ref:'', libelle:'A', debit:75000, credit:0 }];
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 0, 'un GL revendiqué deux fois ne doit profiter à aucune des deux lignes automatiquement');
    assert.equal(res.ambigus.length, 2);
});

test('RAPPROCHEMENT — hors tolérance de date => sans correspondance, pas ambigu ni auto', () => {
    const releve = [{ date:'2025-11-05', libelle:'X', ref:'', debit:0, credit:50000 }];
    const gl = [{ compte:'521100', date:'2025-11-20', ref:'', libelle:'A', debit:50000, credit:0 }]; // 15 jours
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 0);
    assert.equal(res.ambigus.length, 0);
    assert.equal(res.sansCorrespondance.length, 1);
});

test('RAPPROCHEMENT — la correspondance la plus proche en date est retenue quand elle est mutuellement unique', () => {
    const releve = [{ date:'2025-11-10', libelle:'X', ref:'', debit:0, credit:60000 }];
    const gl = [
        { compte:'521100', date:'2025-11-13', ref:'', libelle:'A', debit:60000, credit:0 }, // 3 jours
        { compte:'521100', date:'2025-11-11', ref:'', libelle:'B', debit:70000, credit:0 }  // montant différent, hors jeu
    ];
    const res = ev(`rbRapprocher(${JSON.stringify(releve)}, ${JSON.stringify(gl)}, 5)`);
    assert.equal(res.auto.length, 1);
    assert.equal(res.auto[0].ecritureGL.libelle, 'A');
});

/* ---------------- Catégorisation et proposition d'écriture manquante ---------------- */

test('PROPOSITION — catégorisation par mots-clés (frais / agios / inconnu)', () => {
    assert.equal(ev(`rbCategoriserLigne({libelle:'AGIOS TRIMESTRE', ref:''})`), 'agios');
    assert.equal(ev(`rbCategoriserLigne({libelle:'INTERETS DEBITEURS', ref:''})`), 'agios');
    assert.equal(ev(`rbCategoriserLigne({libelle:'FRAIS TENUE DE COMPTE', ref:''})`), 'frais');
    assert.equal(ev(`rbCategoriserLigne({libelle:'COMMISSION VIREMENT', ref:''})`), 'frais');
    assert.equal(ev(`rbCategoriserLigne({libelle:'VIREMENT SALAIRE XYZ', ref:''})`), 'inconnu');
});

test('PROPOSITION — écriture proposée reprend le bon compte de contrepartie configuré et le bon montant', () => {
    const ligne = { date:'2025-11-05', libelle:'AGIOS', ref:'', debit:15000, credit:0 };
    const comptesDefaut = { frais:'631', agios:'674', inconnu:'471' };
    const prop = ev(`rbProposerEcriture(${JSON.stringify(ligne)}, ['52'], ${JSON.stringify(comptesDefaut)})`);
    assert.equal(prop.categorie, 'agios');
    assert.equal(prop.compteContrepartie, '674');
    assert.equal(prop.compteBanque, '52');
    assert.equal(prop.montant, 15000);
});

test('PROPOSITION — mouvement non identifié garde le libellé d’origine du relevé (traçabilité)', () => {
    const ligne = { date:'2025-11-05', libelle:'VIR SORTANT INCONNU', ref:'REF9', debit:0, credit:8000 };
    const comptesDefaut = { frais:'631', agios:'674', inconnu:'471' };
    const prop = ev(`rbProposerEcriture(${JSON.stringify(ligne)}, ['52'], ${JSON.stringify(comptesDefaut)})`);
    assert.equal(prop.categorie, 'inconnu');
    assert.equal(prop.compteContrepartie, '471');
    assert.equal(prop.libelle, 'VIR SORTANT INCONNU');
});
