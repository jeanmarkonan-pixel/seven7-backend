/* ==================================================================
   PHASE 5 (suite) — RESTRICTIONS PAR PALIER D'ABONNEMENT

   Décision utilisateur (10/08/2026) : certains onglets sont réservés au
   PALIER du cabinet, pas à un rôle (distinct d'E3, déjà couvert par
   tests/pont-dossiers.test.js) — un admin d'un cabinet STARTER n'a pas
   plus accès à ces onglets qu'un de ses collaborateurs.

     · liasse-* (les 18 onglets, PARAMÈTRES compris) : réservé au palier
       CABINET exclusivement — ni STARTER ni PRO n'y ont accès.
     · detection, revue, impots, calendrier : réservés à PRO et CABINET
       — STARTER en est privé.
     · tout le reste des 34 onglets du cycle d'audit reste ouvert à tous
       les paliers (cycle_audit_complet, déjà présent dans STARTER selon
       migration/plans.mjs).

   Cette restriction s'applique UNIQUEMENT via le pont (accès par
   cabinet/rôle) — jamais à l'accès historique par authUid, qui reste
   inchangé quel que soit le palier (non-régression, testée explicitement
   ci-dessous).

   Même émulateur, même projectId que les autres suites de ce dossier.
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

const PROPRIETAIRE = 'uid-proprietaire-palier';
const ADM = 'uid-admin-palier';
const COL = 'uid-collab-palier';

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

async function semer(plan) {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const d = ctx.firestore();

        const cabinetDoc = { codeCabinet: 'PALIERTEST', raisonSociale: 'Cabinet Palier', quotaDossiers: 5, dossiersUtilises: 1, statut: 'ACTIF', adminPrincipalUid: ADM };
        if (plan !== undefined) cabinetDoc.plan = plan; // undefined volontairement pour tester l'absence du champ
        await d.doc('cabinets/PALIERTEST').set(cabinetDoc);
        await d.doc('cabinets/PALIERTEST/membres/' + ADM).set({ uid: ADM, nom: 'Admin', role: 'ADMIN', actif: true, dossiersAffectes: [] });
        await d.doc('cabinets/PALIERTEST/membres/' + COL).set({ uid: COL, nom: 'Collaborateur', role: 'COLLABORATEUR', actif: true, dossiersAffectes: ['1'] });
        await d.doc('cabinets/PALIERTEST/dossiers/1').set({
            intitule: 'Dossier palier', creePar: ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 1, dossierAncienId: 'dossierPalier',
        });

        await d.doc('seven7_dossiers/dossierPalier').set({
            authUid: PROPRIETAIRE, raison: 'Dossier palier', cabinetCode: 'PALIERTEST', dossierNouveauId: '1',
        });
        await d.doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').set({ contenu: 'bilan' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/liasse-parametres').set({ contenu: 'paramètres' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/detection').set({ contenu: 'détection' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/revue').set({ contenu: 'revue' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/impots').set({ contenu: 'impots' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/calendrier').set({ contenu: 'calendrier' });
        await d.doc('seven7_dossiers/dossierPalier/tabs/questionnaire').set({ contenu: 'QCI' });
    });
}

/* ---------- STARTER : ni liasse, ni detection/revue/impots/calendrier ---------- */

test('PALIER STARTER — l’ADMIN n’a pas accès à la liasse (même onglet paramètres) via le pont', opts, async () => {
    await semer('STARTER');
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-parametres').get());
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-parametres').update({ contenu: 'x' }));
});

test('PALIER STARTER — ni l’ADMIN ni le COLLABORATEUR n’ont accès à detection/revue/impots/calendrier', opts, async () => {
    await semer('STARTER');
    for (const tab of ['detection', 'revue', 'impots', 'calendrier']) {
        await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/' + tab).get());
        await assertFails(db(COL).doc('seven7_dossiers/dossierPalier/tabs/' + tab).get());
    }
});

test('PALIER STARTER — le reste du cycle d’audit (ex. questionnaire) reste accessible', opts, async () => {
    await semer('STARTER');
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/questionnaire').get());
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierPalier/tabs/questionnaire').update({ contenu: 'QCI complété' }));
});

/* ---------- PRO : detection/revue/impots/calendrier oui, liasse non -------------- */

test('PALIER PRO — l’ADMIN accède à detection/revue/impots/calendrier', opts, async () => {
    await semer('PRO');
    for (const tab of ['detection', 'revue', 'impots', 'calendrier']) {
        await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/' + tab).get());
    }
});

test('PALIER PRO — la liasse reste hors de portée, même pour l’ADMIN', opts, async () => {
    await semer('PRO');
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-parametres').get());
});

/* ---------- CABINET : tout est ouvert (sous réserve d'E3 pour le collaborateur) -- */

test('PALIER CABINET — l’ADMIN accède à la liasse ET à detection/revue/impots/calendrier', opts, async () => {
    await semer('CABINET');
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').update({ contenu: 'saisi par admin' }));
    for (const tab of ['detection', 'revue', 'impots', 'calendrier']) {
        await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/' + tab).get());
    }
});

test('PALIER CABINET — le COLLABORATEUR lit la liasse mais ne peut pas l’écrire (E3, superposé au palier)', opts, async () => {
    await semer('CABINET');
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertFails(db(COL).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').update({ contenu: 'intrusion' }));
    await assertSucceeds(db(COL).doc('seven7_dossiers/dossierPalier/tabs/liasse-parametres').update({ contenu: 'réglage' }));
});

/* ---------- Non-régression et cas limite ------------------------------------------ */

test('NON-RÉGRESSION — le propriétaire historique (authUid) accède à tout, quel que soit le palier', opts, async () => {
    await semer('STARTER');
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').update({ contenu: 'toujours modifiable par le compte historique' }));
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierPalier/tabs/detection').get());
});

test('CAS LIMITE — un cabinet sans champ "plan" refuse l’accès par défaut (échec d’évaluation = refus)', opts, async () => {
    await semer(undefined);
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/liasse-actif').get());
    await assertFails(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/detection').get());
    // Le reste du cycle, non concerné par ongletReserveParPalier, continue de fonctionner.
    await assertSucceeds(db(ADM).doc('seven7_dossiers/dossierPalier/tabs/questionnaire').get());
});

/* ---------- E5 : /plans — lecture publique, écriture jamais côté client ---------- */

test('E5 — /plans se lit sans compte (écran de comparaison avant connexion)', opts, async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('plans/STARTER').set({ id: 'STARTER', libelle: 'Starter', quotaDossiers: 5 });
    });
    await assertSucceeds(db(null).doc('plans/STARTER').get());
});

test('E5 — /plans ne s’écrit jamais depuis un client, même admin de cabinet', opts, async () => {
    await semer('CABINET');
    await assertFails(db(ADM).doc('plans/STARTER').set({ id: 'STARTER', quotaDossiers: 99999 }));
});
