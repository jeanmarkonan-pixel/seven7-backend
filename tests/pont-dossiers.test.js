/* ==================================================================
   PHASE 5 — PONT ENTRE UN ANCIEN DOSSIER ET LE NOUVEAU MODÈLE

   Un seven7_dossiers/{id} lié à un cabinet porte deux champs en plus :
   cabinetCode et dossierNouveauId. Ces tests couvrent trois choses,
   dans cet ordre de priorité :

   1. NON-RÉGRESSION ABSOLUE — un dossier NON lié (sans ces deux
      champs) doit se comporter EXACTEMENT comme avant cette phase :
      seul authUid gouverne. C'est le risque le plus grave de toute
      cette phase — une régression ici casserait les dossiers déjà en
      production, qui ne sont pas liés. Voir aussi tests/rules.test.js
      (ancien modèle, inchangé) et tests/cabinets-roles.test.js
      (phase 2/4, inchangés), qui doivent rester verts en parallèle.
   2. LECTURE via le pont — un membre affecté (ou un admin) lit le
      dossier, l'admin voit tout sans affectation explicite.
   3. E3 — un collaborateur ne peut pas écrire un onglet de la liasse
      (liasse-*, sauf liasse-parametres qui reste ouvert à tous),
      mais peut écrire les autres onglets (cycle d'audit).

   Même émulateur, même projectId que les autres suites Firestore de
   ce dossier (singleProjectMode: true, voir tests/creation-collaborateur.test.js)
   — node --test doit tourner avec --test-concurrency=1 (package.json).
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';
import { RACINE } from './harness.js';

const HOTE = '127.0.0.1';
const PORT = 8080;

let dispo = false;
try {
    const r = await fetch(`http://${HOTE}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
    dispo = r.status < 500;
} catch { dispo = false; }

const opts = dispo ? {} : { skip: 'émulateur Firestore injoignable — lancez `npm run emulateur:complet`' };

let env;
if (dispo) {
    env = await initializeTestEnvironment({
        projectId: 'seven7-audit-test',
        firestore: {
            host: HOTE, port: PORT,
            rules: fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8'),
        },
    });
    test.after(() => env.cleanup());
}

const PROPRIETAIRE = 'uid-proprietaire-ancien'; // authUid historique du dossier NON lié
const ADM = 'uid-admin-pont';
const COL = 'uid-collab-pont';
const AUTRE_COL = 'uid-collab-non-affecte';

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

async function semer() {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const d = ctx.firestore();

        // Cabinet + membres (admin, collaborateur affecté, collaborateur non affecté).
        await d.doc('cabinets/PONTTEST').set({
            codeCabinet: 'PONTTEST', raisonSociale: 'Cabinet Pont', plan: 'STARTER',
            quotaDossiers: 5, dossiersUtilises: 1, statut: 'ACTIF', adminPrincipalUid: ADM,
        });
        await d.doc('cabinets/PONTTEST/membres/' + ADM).set({
            uid: ADM, nom: 'Admin', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/PONTTEST/membres/' + COL).set({
            uid: COL, nom: 'Collaborateur affecté', role: 'COLLABORATEUR', actif: true, dossiersAffectes: ['1'],
        });
        await d.doc('cabinets/PONTTEST/membres/' + AUTRE_COL).set({
            uid: AUTRE_COL, nom: 'Collaborateur non affecté', role: 'COLLABORATEUR', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/PONTTEST/dossiers/1').set({
            intitule: 'Dossier lié', creePar: ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 1, dossierAncienId: 'dossierLie',
        });

        // Le dossier ANCIEN, lié (porte cabinetCode + dossierNouveauId).
        await d.doc('seven7_dossiers/dossierLie').set({
            authUid: PROPRIETAIRE, raison: 'Dossier lié',
            cabinetCode: 'PONTTEST', dossierNouveauId: '1',
        });
        await d.doc('seven7_dossiers/dossierLie/tabs/liasse-actif').set({ contenu: 'bilan actif confidentiel' });
        await d.doc('seven7_dossiers/dossierLie/tabs/liasse-parametres').set({ contenu: 'paramètres fiscaux' });
        await d.doc('seven7_dossiers/dossierLie/tabs/questionnaire').set({ contenu: 'QCI en cours' });

        // Le dossier ANCIEN, NON lié — aucun champ cabinetCode/dossierNouveauId.
        // C'est LE cas de non-régression : doit se comporter à l'identique
        // d'avant cette phase, quel que soit l'utilisateur qui essaie.
        await d.doc('seven7_dossiers/dossierNonLie').set({ authUid: PROPRIETAIRE, raison: 'Dossier non lié' });
        await d.doc('seven7_dossiers/dossierNonLie/tabs/liasse-actif').set({ contenu: 'bilan non lié' });
    });
}

/* ---------- 1. NON-RÉGRESSION — dossier NON lié -------------------------- */

test('NON-RÉGRESSION — un dossier non lié reste accessible SEULEMENT à son authUid historique', opts, async () => {
    await semer();
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierNonLie').get());
    await assertFails(db(ADM).doc('seven7_dossiers/dossierNonLie').get());
    await assertFails(db(COL).doc('seven7_dossiers/dossierNonLie').get());
    await assertFails(db(null).doc('seven7_dossiers/dossierNonLie').get());
});

test('NON-RÉGRESSION — les onglets d’un dossier non lié suivent la même règle, y compris liasse-*', opts, async () => {
    await semer();
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierNonLie/tabs/liasse-actif').get());
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierNonLie/tabs/liasse-actif').update({ contenu: 'modifié' }));
    await assertFails(db(ADM).doc('seven7_dossiers/dossierNonLie/tabs/liasse-actif').get());
    await assertFails(db(COL).doc('seven7_dossiers/dossierNonLie/tabs/liasse-actif').get());
});

/* ---------- 2. LECTURE via le pont ---------------------------------------- */

test('PONT — le propriétaire historique garde son accès complet, inchangé', opts, async () => {
    await semer();
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierLie').get());
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierLie/tabs/liasse-actif').update({ contenu: 'toujours modifiable par le compte historique' }));
});

test('PONT — l’admin du cabinet lit le dossier lié sans affectation explicite', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierLie').get());
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierLie/tabs/liasse-actif').get());
});

test('PONT — le collaborateur affecté lit le dossier ; le non-affecté échoue', opts, async () => {
    await semer();
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierLie').get());
    await assertFails(db(AUTRE_COL).doc('seven7_dossiers/dossierLie').get());
});

test('PONT — un membre d’un AUTRE cabinet ne lit rien via le pont', opts, async () => {
    await semer();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('cabinets/AUTRECAB/membres/uid-etranger').set({
            uid: 'uid-etranger', nom: 'Étranger', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
    });
    await assertFails(db('uid-etranger').doc('seven7_dossiers/dossierLie').get());
});

/* ---------- 3. E3 — verrouillage de la liasse au collaborateur ----------- */

test('E3 — un collaborateur affecté NE PEUT PAS écrire un onglet de la liasse', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('seven7_dossiers/dossierLie/tabs/liasse-actif').update({ contenu: 'intrusion' }));
});

test('E3 — un collaborateur affecté PEUT écrire liasse-parametres (laissé modifiable)', opts, async () => {
    await semer();
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierLie/tabs/liasse-parametres').update({ contenu: 'réglage mis à jour' }));
});

test('E3 — un collaborateur affecté PEUT écrire un onglet hors liasse (questionnaire CI)', opts, async () => {
    await semer();
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierLie/tabs/questionnaire').update({ contenu: 'QCI complété' }));
});

test('E3 — l’admin du cabinet PEUT écrire un onglet de la liasse via le pont', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierLie/tabs/liasse-actif').update({ contenu: 'saisi par l’admin' }));
});

test('E3 — un collaborateur non affecté ne peut ni lire ni écrire aucun onglet', opts, async () => {
    await semer();
    await assertFails(db(AUTRE_COL).doc('seven7_dossiers/dossierLie/tabs/questionnaire').get());
    await assertFails(db(AUTRE_COL).doc('seven7_dossiers/dossierLie/tabs/questionnaire').update({ contenu: 'intrusion' }));
});

test('E3 — un collaborateur désactivé perd l’accès au dossier lié, y compris hors liasse', opts, async () => {
    await semer();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('cabinets/PONTTEST/membres/' + COL).update({ actif: false });
    });
    await assertFails(db(COL).doc('seven7_dossiers/dossierLie/tabs/questionnaire').get());
});
