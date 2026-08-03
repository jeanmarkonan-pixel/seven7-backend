/* ==================================================================
   CHANTIER 3 — RÈGLES DE SÉCURITÉ FIRESTORE

   Ces tests tournent contre l'émulateur Firestore, jamais contre le
   projet réel. Ils vérifient qu'un cabinet ne peut pas lire le
   dossier d'un autre, et que le pont de migration des anciens
   dossiers ne peut pas servir à voler un dossier.

       npm run emulateur     # dans un premier terminal
       npm run test:regles   # dans un second

   L'émulateur Firestore exige un JDK (Java 11 ou plus). Sans lui,
   ces tests sont ignorés plutôt que déclarés en échec : la suite
   principale reste exploitable sur un poste sans Java.
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

/* L'émulateur répond-il ? Sinon on saute tout le fichier. */
let dispo = false;
try {
    const r = await fetch(`http://${HOTE}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
    dispo = r.status < 500;
} catch { dispo = false; }

const opts = dispo ? {} : { skip: 'émulateur Firestore injoignable — lancez `npm run emulateur`' };

let env;
if(dispo){
    env = await initializeTestEnvironment({
        projectId: 'seven7-audit-test',
        firestore: {
            host: HOTE, port: PORT,
            rules: fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8'),
        },
    });
    test.after(() => env.cleanup());
}

/* --- acteurs -------------------------------------------------------
   cabinetA détient le dossier "dossierA", cabinetB le dossier "dossierB".
   Chaque dossier a son propre compte Firebase Auth : c'est le modèle
   retenu par l'application (un compte email+mot de passe par dossier). */
const A = 'uid-cabinet-A';
const B = 'uid-cabinet-B';

const db = uid => uid ? env.authenticatedContext(uid).firestore()
                      : env.unauthenticatedContext().firestore();

async function semer(){
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
        const d = ctx.firestore();
        await d.doc('seven7_dossiers/dossierA').set({ authUid: A, raison: 'Cabinet A' });
        await d.doc('seven7_dossiers/dossierB').set({ authUid: B, raison: 'Cabinet B' });
        await d.doc('seven7_dossiers/dossierA/tabs/bilan').set({ contenu: 'confidentiel A' });
        await d.doc('seven7_dossiers/dossierA/conversations/dm__admin__x').set({ sujet: 'A' });
        await d.doc('seven7_dossiers/dossierA/conversations/dm__admin__x/messages/m1').set({ text: 'A' });
        // dossier hérité : pas de champ authUid, mot de passe encore en clair
        await d.doc('seven7_dossiers/dossierLegacy').set({ password: 'secret-connu', raison: 'Ancien' });
        await d.doc('seven7_cabinets/CAB1').set({ palier: 'PRO', plafondDossiers: 10, dossiersCreesAnnee: 3 });
        await d.doc('seven7_dossiers_public/dossierA').set({ nomCabinet: 'Cabinet A' });
    });
}

test('ISOLATION — un cabinet ne lit pas le dossier d’un autre', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_dossiers/dossierA').get());
    await assertFails(db(B).doc('seven7_dossiers/dossierA').get());
    await assertFails(db(null).doc('seven7_dossiers/dossierA').get());
});

test('ISOLATION — un cabinet n’écrit pas dans le dossier d’un autre', opts, async () => {
    await semer();
    await assertFails(db(B).doc('seven7_dossiers/dossierA').update({ raison: 'détourné' }));
    await assertFails(db(B).doc('seven7_dossiers/dossierA').delete());
});

test('ISOLATION — les onglets d’un dossier suivent la même règle', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_dossiers/dossierA/tabs/bilan').get());
    await assertFails(db(B).doc('seven7_dossiers/dossierA/tabs/bilan').get());
    await assertFails(db(null).doc('seven7_dossiers/dossierA/tabs/bilan').get());
});

test('CRÉATION — on ne peut créer un dossier qu’à son propre uid', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_dossiers/nouveauA').set({ authUid: A }));
    // se déclarer propriétaire au nom d'un autre : refusé
    await assertFails(db(A).doc('seven7_dossiers/nouveauB').set({ authUid: B }));
    await assertFails(db(null).doc('seven7_dossiers/nouveauX').set({ authUid: 'peu-importe' }));
});

test('MIGRATION — le pont exige le vrai mot de passe et n’ajoute que authUid', opts, async () => {
    await semer();
    // sans connaître le mot de passe : refusé
    await assertFails(db(B).doc('seven7_dossiers/dossierLegacy')
        .update({ password: 'devine', authUid: B }));
    // en le connaissant : accepté, et le dossier devient celui de B
    await assertSucceeds(db(B).doc('seven7_dossiers/dossierLegacy')
        .update({ password: 'secret-connu', authUid: B }));
});

test('MIGRATION — le pont ne permet pas de modifier autre chose au passage', opts, async () => {
    await semer();
    await assertFails(db(B).doc('seven7_dossiers/dossierLegacy')
        .update({ password: 'secret-connu', authUid: B, raison: 'Détourné' }));
});

test('MIGRATION — le pont ne se rejoue pas sur un dossier déjà migré', opts, async () => {
    await semer();
    await assertFails(db(B).doc('seven7_dossiers/dossierA')
        .update({ password: 'peu-importe', authUid: B }));
});

test('CABINETS — le compteur ne monte que de 1 à la fois', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_cabinets/CAB1').update({ dossiersCreesAnnee: 4 }));
    await semer();
    await assertFails(db(A).doc('seven7_cabinets/CAB1').update({ dossiersCreesAnnee: 5 }));
    await semer();
    await assertFails(db(A).doc('seven7_cabinets/CAB1').update({ dossiersCreesAnnee: 2 }));
});

test('CABINETS — le palier et le plafond ne sont pas modifiables depuis le client', opts, async () => {
    await semer();
    await assertFails(db(A).doc('seven7_cabinets/CAB1')
        .update({ dossiersCreesAnnee: 4, plafondDossiers: 9999 }));
    await assertFails(db(A).doc('seven7_cabinets/CAB1').update({ palier: 'ILLIMITE' }));
    await assertFails(db(A).doc('seven7_cabinets/CAB2').set({ palier: 'PRO', plafondDossiers: 50 }));
});

test('CABINETS — le plafond d’abonnement est opposable', opts, async () => {
    // Choix commercial arrêté le 03/08/2026 : le plafond bloque pour de bon.
    // Un cabinet qui l'atteint doit changer de palier — il n'y a plus de
    // dépassement facturé à l'unité, que la grille tarifaire annonçait.
    //
    // Ne pas neutraliser ce test sans décision commerciale explicite : il
    // garde la condition que la production avait perdue une fois déjà.
    await env.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc('seven7_cabinets/CABPLEIN')
            .set({ palier: 'Cabinet', plafondDossiers: 20, dossiersCreesAnnee: 20 });
    });
    await assertFails(db(A).doc('seven7_cabinets/CABPLEIN').update({ dossiersCreesAnnee: 21 }));
});

test('CABINETS — le palier illimité n’est pas bloqué par le plafond', opts, async () => {
    // « Cabinet Plus » est illimité au tarif mais pas dans le code : il se
    // représente par un plafond très grand (SEUIL_ILLIMITE = 9999 dans
    // src/js/10-config-collaboration.js). Ce test fixe la convention — un
    // Cabinet Plus créé sans plafondDossiers serait bloqué net.
    await env.withSecurityRulesDisabled(async ctx => {
        await ctx.firestore().doc('seven7_cabinets/CABPLUS')
            .set({ palier: 'Cabinet Plus', plafondDossiers: 999999, dossiersCreesAnnee: 250 });
        await ctx.firestore().doc('seven7_cabinets/CABSANSPLAFOND')
            .set({ palier: 'Cabinet Plus', dossiersCreesAnnee: 3 });
    });
    await assertSucceeds(db(A).doc('seven7_cabinets/CABPLUS').update({ dossiersCreesAnnee: 251 }));
    // sans plafondDossiers, l'évaluation échoue : le cabinet est bloqué
    await assertFails(db(A).doc('seven7_cabinets/CABSANSPLAFOND').update({ dossiersCreesAnnee: 4 }));
});

test('PUBLIC — la vitrine se lit un dossier à la fois, sans compte', opts, async () => {
    await semer();
    await assertSucceeds(db(null).doc('seven7_dossiers_public/dossierA').get());
    await assertFails(db(null).doc('seven7_dossiers_public/dossierA').set({ nomCabinet: 'Faux' }));
    await assertFails(db(B).doc('seven7_dossiers_public/dossierA').set({ nomCabinet: 'Faux' }));
    await assertSucceeds(db(A).doc('seven7_dossiers_public/dossierA').set({ nomCabinet: 'Cabinet A' }));
});

test('PUBLIC — seul le compte du cabinet peut lister ses dossiers', opts, async () => {
    // `allow get` reste public pour l'écran de connexion, mais `allow list`
    // est réservé au compte Auth du cabinet : sans cette distinction, un
    // tiers énumérerait la clientèle entière.
    await semer();
    await assertFails(db(null).collection('seven7_dossiers_public').get());
    await assertFails(db(A).collection('seven7_dossiers_public').get());

    const cab = env.authenticatedContext('uid-cabinet-CAB1',
        { email: 'cabinet-cab1@seven7-audit.local' }).firestore();
    await assertSucceeds(cab.collection('seven7_dossiers_public')
        .where('cabinetId', '==', 'CAB1').get());
    // le compte d'un cabinet ne liste pas les dossiers d'un autre
    await assertFails(cab.collection('seven7_dossiers_public')
        .where('cabinetId', '==', 'CAB2').get());
});

/* --- Trous refermés depuis --------------------------------------------
   Ces deux collections existaient dans le code sans règle correspondante,
   donc refusées à tous, y compris au propriétaire. La version déployée le
   03/08/2026 les couvre. Les tests le vérifient désormais dans le bon sens. */

test('MESSAGERIE — accessible à son propriétaire, refusée aux autres', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_dossiers/dossierA/conversations/dm__admin__x').get());
    await assertSucceeds(db(A).doc('seven7_dossiers/dossierA/conversations/dm__admin__x/messages/m1').get());
    await assertSucceeds(db(A).collection('seven7_dossiers/dossierA/conversations/dm__admin__x/messages')
        .add({ text: 'bonjour' }));
    await assertFails(db(B).doc('seven7_dossiers/dossierA/conversations/dm__admin__x').get());
    await assertFails(db(B).doc('seven7_dossiers/dossierA/conversations/dm__admin__x/messages/m1').get());
    await assertFails(db(null).doc('seven7_dossiers/dossierA/conversations/dm__admin__x').get());
});

test('STATISTIQUES — la sous-collection cabinets est couverte', opts, async () => {
    await semer();
    await assertSucceeds(db(A).doc('seven7_usage_stats/2026-08-03').set({ lectures: 1 }));
    await assertSucceeds(db(A).doc('seven7_usage_stats/2026-08-03/cabinets/CAB1').set({ lectures: 1 }));
    await assertFails(db(null).doc('seven7_usage_stats/2026-08-03/cabinets/CAB1').set({ lectures: 1 }));
});
