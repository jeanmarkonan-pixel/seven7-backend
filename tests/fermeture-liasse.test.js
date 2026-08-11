/* ==================================================================
   FERMETURE CONTRÔLÉE DU MODULE LIASSE (11/08/2026)

   Voir CHANGELOG_FERMETURE_LIASSE.md et le prompt qui l'a demandée.
   Contrairement à ongletLiasseVerrouille (rôle) et ongletReserveParPalier
   (palier, pont seulement), cette fermeture s'applique AUSSI au
   propriétaire historique par authUid — la seule restriction de tout ce
   fichier à traverser cette frontière. C'est le risque principal à
   couvrir : ne fermer QUE l'écriture des onglets liasse-*, ne RIEN
   casser d'autre (lecture, onglets hors liasse, dossiers non liasse).

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

const PROPRIETAIRE = 'uid-proprietaire-fermeture';
const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

async function semer(featuresDoc) {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const d = ctx.firestore();
        if (featuresDoc !== undefined) {
            await d.doc('config_globale/features').set(featuresDoc);
        }
        await d.doc('seven7_dossiers/dossierFermeture').set({ authUid: PROPRIETAIRE, raison: 'Dossier fermeture liasse' });
        await d.doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').set({ contenu: 'bilan actif' });
        await d.doc('seven7_dossiers/dossierFermeture/tabs/questionnaire').set({ contenu: 'QCI' });
    });
}

test('FERMETURE — sans config_globale/features, le propriétaire authUid ne peut PAS écrire un onglet liasse', opts, async () => {
    await semer(undefined);
    await assertFails(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').update({ contenu: 'modifié' }));
});

test('FERMETURE — LIASSE_ENABLED: false explicite, même refus pour le propriétaire authUid', opts, async () => {
    await semer({ LIASSE_ENABLED: false, liasse_beta_dossiers: [] });
    await assertFails(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').update({ contenu: 'modifié' }));
});

test('FERMETURE — la LECTURE d’un onglet liasse reste autorisée au propriétaire, même fermé (contenu déjà saisi consultable)', opts, async () => {
    await semer({ LIASSE_ENABLED: false, liasse_beta_dossiers: [] });
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').get());
});

test('FERMETURE — les onglets HORS liasse restent pleinement fonctionnels, fermeture ou non', opts, async () => {
    await semer({ LIASSE_ENABLED: false, liasse_beta_dossiers: [] });
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/questionnaire').update({ contenu: 'QCI complété' }));
});

test('OUVERTURE — LIASSE_ENABLED: true autorise l’écriture pour le propriétaire authUid', opts, async () => {
    await semer({ LIASSE_ENABLED: true });
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').update({ contenu: 'modifié' }));
});

test('LISTE BLANCHE — un dossier listé accède à la liasse même si LIASSE_ENABLED est false', opts, async () => {
    await semer({ LIASSE_ENABLED: false, liasse_beta_dossiers: ['dossierFermeture'] });
    await assertSucceeds(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').update({ contenu: 'testeur validateur' }));
});

test('LISTE BLANCHE — un AUTRE dossier non listé reste fermé', opts, async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        await ctx.firestore().doc('config_globale/features').set({ LIASSE_ENABLED: false, liasse_beta_dossiers: ['unAutreDossier'] });
        await ctx.firestore().doc('seven7_dossiers/dossierFermeture').set({ authUid: PROPRIETAIRE, raison: 'Non listé' });
        await ctx.firestore().doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').set({ contenu: 'bilan' });
    });
    await assertFails(db(PROPRIETAIRE).doc('seven7_dossiers/dossierFermeture/tabs/liasse-actif').update({ contenu: 'tentative' }));
});

test('CONFIG_GLOBALE — /features se lit sans compte, mais ne s’écrit jamais depuis un client', opts, async () => {
    await semer({ LIASSE_ENABLED: true });
    await assertSucceeds(db(null).doc('config_globale/features').get());
    await assertFails(db(PROPRIETAIRE).doc('config_globale/features').update({ LIASSE_ENABLED: true }));
});

test('LISTE D’ATTENTE — un utilisateur authentifié peut s’inscrire, mais ne peut ni lire ni modifier ni supprimer', opts, async () => {
    await semer(undefined);
    const ref = db(PROPRIETAIRE).collection('liasse_waitlist').doc();
    await assertSucceeds(ref.set({ nomCabinet: 'Test', contact: 'X', email: 'x@example.com' }));
    await assertFails(ref.get());
    await assertFails(ref.update({ nomCabinet: 'Modifié' }));
    await assertFails(ref.delete());
});

test('LISTE D’ATTENTE — un visiteur non authentifié ne peut pas s’inscrire', opts, async () => {
    await semer(undefined);
    await assertFails(db(null).collection('liasse_waitlist').add({ nomCabinet: 'Test' }));
});
