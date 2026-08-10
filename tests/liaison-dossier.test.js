/* ==================================================================
   PHASE 5 (suite) — LIER UN DOSSIER ANCIEN EXISTANT À UN CABINET

   Couvre la règle d'écriture ajoutée sur seven7_dossiers/{dossier}
   permettant à un ADMIN de cabinet (PAS le propriétaire historique du
   dossier — une session Auth ne tient qu'un seul compte à la fois) de
   poser cabinetCode + dossierNouveauId, en prouvant sa connaissance du
   mot de passe du dossier en le resoumettant inchangé dans la même
   écriture (choix explicite de l'utilisateur, 10/08/2026 : preuve de
   mot de passe dans la règle plutôt qu'une double connexion).

   Le flux attendu, tel que l'écran devra l'exécuter dans cet ordre :
     1. créer cabinets/{code}/dossiers/{nouvelId} avec dossierAncienId
        (règle E2 déjà existante : estAdmin + quotaDisponible + …) ;
     2. incrémenter cabinets/{code}.dossiersUtilises de 1 (règle déjà
        existante, inchangée par cette phase) ;
     3. poser cabinetCode + dossierNouveauId sur seven7_dossiers/{id}
        (la règle testée ici).
   Ces trois tests-ci ne couvrent QUE l'étape 3 — les étapes 1 et 2
   sont déjà couvertes par tests/cabinets-roles.test.js.

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

const PROPRIETAIRE = 'uid-proprietaire-liaison';
const ADM = 'uid-admin-liaison';
const COL = 'uid-collab-liaison';
const AUTRE_ADM = 'uid-admin-autre-cabinet';
const MOT_DE_PASSE = 'motDePasseDossierSecret123';

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

async function semer({ cabinetActif = true, contrepartieExiste = true, contrepartiePointeVersLeBonDossier = true } = {}) {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const d = ctx.firestore();

        await d.doc('cabinets/LIAISON1').set({
            codeCabinet: 'LIAISON1', raisonSociale: 'Cabinet Liaison', plan: 'STARTER',
            quotaDossiers: 5, dossiersUtilises: 1, statut: cabinetActif ? 'ACTIF' : 'SUSPENDU', adminPrincipalUid: ADM,
        });
        await d.doc('cabinets/LIAISON1/membres/' + ADM).set({
            uid: ADM, nom: 'Admin', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/LIAISON1/membres/' + COL).set({
            uid: COL, nom: 'Collaborateur', role: 'COLLABORATEUR', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/LIAISON2').set({
            codeCabinet: 'LIAISON2', raisonSociale: 'Autre Cabinet', plan: 'STARTER',
            quotaDossiers: 5, dossiersUtilises: 0, statut: 'ACTIF', adminPrincipalUid: AUTRE_ADM,
        });
        await d.doc('cabinets/LIAISON2/membres/' + AUTRE_ADM).set({
            uid: AUTRE_ADM, nom: 'Admin autre cabinet', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });

        if (contrepartieExiste) {
            await d.doc('cabinets/LIAISON1/dossiers/nouveau1').set({
                intitule: 'Dossier à lier', creePar: ADM, statut: 'EN_COURS',
                liasseVerrouillee: true, numeroSequence: 2,
                dossierAncienId: contrepartiePointeVersLeBonDossier ? 'ancien1' : 'unAutreDossier',
            });
        }

        await d.doc('seven7_dossiers/ancien1').set({ authUid: PROPRIETAIRE, raison: 'Dossier ancien', password: MOT_DE_PASSE });
    });
}

test('LIAISON — l’admin lie le dossier ancien quand la contrepartie existe déjà et le mot de passe est correct', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — échoue si la contrepartie cabinets/{code}/dossiers n’existe pas encore (anti-contournement du quota)', opts, async () => {
    await semer({ contrepartieExiste: false });
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — échoue si la contrepartie pointe vers un AUTRE dossier ancien', opts, async () => {
    await semer({ contrepartiePointeVersLeBonDossier: false });
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — échoue avec un mot de passe incorrect', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: 'mauvais-mot-de-passe',
    }));
});

test('LIAISON — un COLLABORATEUR (non admin) ne peut pas lier, même avec le bon mot de passe', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — un admin d’un cabinet SUSPENDU ne peut pas lier', opts, async () => {
    await semer({ cabinetActif: false });
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — un dossier déjà lié ne peut pas être relié ailleurs (anti-vol)', opts, async () => {
    await semer();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('seven7_dossiers/ancien1').update({ cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1' });
        await ctx.firestore().doc('cabinets/LIAISON2/dossiers/vol1').set({
            intitule: 'Tentative de vol', creePar: AUTRE_ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 1, dossierAncienId: 'ancien1',
        });
    });
    await assertFails(db(AUTRE_ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON2', dossierNouveauId: 'vol1', password: MOT_DE_PASSE,
    }));
});

test('LIAISON — la même écriture ne peut modifier aucun autre champ du dossier', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE, raison: 'renommé au passage',
    }));
});

test('LIAISON — un admin d’un AUTRE cabinet PEUT lier ce dossier à SON cabinet s’il connaît le mot de passe (le mot de passe est le vrai secret, pas l’appartenance à un cabinet précis) — mais UNE FOIS lié, aucun des deux ne peut plus le relier ailleurs', opts, async () => {
    await semer();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('cabinets/LIAISON2/dossiers/nouveau1').set({
            intitule: 'Dossier à lier (autre cabinet)', creePar: AUTRE_ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 1, dossierAncienId: 'ancien1',
        });
    });
    await assertSucceeds(db(AUTRE_ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON2', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
    await assertFails(db(ADM).doc('seven7_dossiers/ancien1').update({
        cabinetCode: 'LIAISON1', dossierNouveauId: 'nouveau1', password: MOT_DE_PASSE,
    }));
});
