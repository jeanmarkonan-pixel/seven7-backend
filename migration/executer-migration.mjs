/* ==================================================================
   PHASE 1 — EXÉCUTION DE LA MIGRATION D'UN CABINET

   Usage :

     # Contre l'émulateur (toujours en premier — voir README de ce dossier)
     firebase emulators:start --only firestore,auth --project seven7-audit-test
     FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
       node migration/executer-migration.mjs --code KONAN2026 \
         --raison "Cabinet Konan & Associés" --email admin@cabinet-konan.example \
         --nomAdmin "Konan" --motDePasseAdmin "..." --projet seven7-audit-test

     # Contre la production (nécessite GOOGLE_APPLICATION_CREDENTIALS
     # pointant vers une clé de compte de service — jamais commitée)
     node migration/executer-migration.mjs --code KONAN2026 --production ...

   RÈGLE DE SÉCURITÉ (interdit §12 du cahier des charges) : cette
   commande n'écrit jamais dans l'ancien document seven7_cabinets/{code}
   ni ne le supprime — purement additive. Avant toute écriture, l'état
   actuel des documents concernés est exporté dans un fichier JSON
   horodaté (dossier migration/sauvegardes/), qui sert de sauvegarde.
   ================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PLANS } from './plans.mjs';
import { migrerCabinet, membreAdmin } from './migrer-cabinet.mjs';

const RACINE = path.dirname(fileURLToPath(import.meta.url));

function lireArguments(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue;
        const clef = argv[i].slice(2);
        const suivant = argv[i + 1];
        args[clef] = (suivant === undefined || suivant.startsWith('--')) ? true : suivant;
    }
    return args;
}

function initialiserApp(args) {
    const options = args.projet ? { projectId: args.projet } : {};
    if (args.production) {
        // GOOGLE_APPLICATION_CREDENTIALS doit pointer vers une clé de
        // compte de service. Jamais lue depuis un chemin en dur ici.
        options.credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? applicationDefault()
            : (() => { throw new Error(
                'Migration en production demandée sans GOOGLE_APPLICATION_CREDENTIALS. '
              + 'Définissez cette variable vers une clé de compte de service avant de relancer.'); })();
    }
    return initializeApp(options);
}

async function sauvegarder(db, codeCabinet) {
    const dossierSauvegardes = path.join(RACINE, 'sauvegardes');
    fs.mkdirSync(dossierSauvegardes, { recursive: true });

    const ancien = await db.doc(`seven7_cabinets/${codeCabinet}`).get();
    const nouveauExistant = await db.doc(`cabinets/${codeCabinet}`).get();

    const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
    const fichier = path.join(dossierSauvegardes, `${codeCabinet}-${horodatage}.json`);
    fs.writeFileSync(fichier, JSON.stringify({
        codeCabinet,
        horodatage,
        seven7_cabinets: ancien.exists ? ancien.data() : null,
        cabinets: nouveauExistant.exists ? nouveauExistant.data() : null,
    }, null, 2), 'utf8');

    console.log(`  sauvegarde écrite : ${fichier}`);
    return { ancien, nouveauExistant };
}

async function seedPlans(db) {
    const lot = db.batch();
    for (const plan of PLANS) {
        lot.set(db.doc(`plans/${plan.id}`), plan, { merge: true });
    }
    await lot.commit();
    console.log(`  /plans : ${PLANS.length} palier(s) écrit(s) (STARTER, PRO, CABINET)`);
}

/**
 * Email de connexion CODE_CABINET, jamais utilisé pour envoyer un vrai
 * e-mail — même convention, au caractère près, que cabinetAuthEmail()
 * dans src/js/10-config-collaboration.js (déjà utilisée par l'écran
 * « Vous êtes admin de cabinet ? »). La réutiliser ici, plutôt que
 * d'inventer une seconde convention, est ce qui rend l'authentification
 * par CODE_CABINET (§4) possible : l'app doit résoudre un email à
 * partir du seul code, AVANT toute authentification — elle ne peut donc
 * pas lire emailContact (qui vit dans un document Firestore protégé par
 * des règles exigeant justement d'être déjà connecté).
 */
function cabinetAuthEmail(codeCabinet) {
    return 'cabinet-' + String(codeCabinet).toLowerCase() + '@seven7-audit.local';
}

/**
 * @param emailContact  adresse RÉELLE de contact — stockée dans Firestore
 *   (cabinets/{code}.emailContact, membres/{uid}.email), jamais utilisée
 *   comme identifiant Auth. Un compte Auth dont l'email serait cette
 *   adresse ne pourrait pas se connecter par CODE_CABINET : rien ne
 *   permettrait de la retrouver avant authentification.
 */
async function assurerCompteAdmin(auth, codeCabinet, emailContact, motDePasse, nom) {
    const emailAuth = cabinetAuthEmail(codeCabinet);
    try {
        const existant = await auth.getUserByEmail(emailAuth);
        console.log(`  compte Auth admin déjà existant : ${emailAuth} (uid ${existant.uid})`);
        return existant.uid;
    } catch (erreur) {
        if (erreur.code !== 'auth/user-not-found') throw erreur;
    }
    if (!motDePasse) {
        throw new Error(
            `Aucun compte Auth pour ${emailAuth}, et --motDePasseAdmin non fourni pour en créer un. `
          + `Fournissez un mot de passe provisoire (l'administrateur devra le changer à la première connexion).`);
    }
    // displayName porte l'email de contact réel : c'est ce que la console
    // Firebase affiche, pour qu'un opérateur SEVEN7 retrouve la personne
    // derrière emailAuth sans avoir à ouvrir Firestore.
    const cree = await auth.createUser({
        email: emailAuth, password: motDePasse, displayName: `${nom} <${emailContact}>`,
    });
    console.log(`  compte Auth admin créé : ${emailAuth} (uid ${cree.uid}) — contact réel : ${emailContact}`);
    return cree.uid;
}

async function migrer(args) {
    const codeCabinet = String(args.code || '').toUpperCase();
    if (!codeCabinet) throw new Error('--code est obligatoire (ex. --code KONAN2026).');
    if (!args.raison) throw new Error('--raison est obligatoire (raison sociale, absente de l’ancien schéma).');
    if (!args.email) throw new Error('--email est obligatoire (adresse de contact ET identifiant Auth de l’admin).');

    const app = initialiserApp(args);
    const db = getFirestore(app);
    const auth = getAuth(app);

    console.log(`\n=== Migration du cabinet ${codeCabinet} ===`);

    const { ancien, nouveauExistant } = await sauvegarder(db, codeCabinet);

    if (nouveauExistant.exists && nouveauExistant.data().migreDepuisAncienSchema) {
        console.log(`  déjà migré (cabinets/${codeCabinet} porte migreDepuisAncienSchema:true) — `
            + `rien à refaire. Idempotent par construction.`);
        return;
    }
    if (!ancien.exists) {
        throw new Error(`seven7_cabinets/${codeCabinet} introuvable : rien à migrer. `
            + `Si ce cabinet est nouveau, créez-le directement au nouveau schéma, sans ce script.`);
    }

    await seedPlans(db);

    const uidAdmin = await assurerCompteAdmin(
        auth, codeCabinet, args.email, args.motDePasseAdmin, args.nomAdmin || codeCabinet);

    const { document, avertissements } = migrerCabinet(ancien.data(), {
        codeCabinet,
        raisonSociale: args.raison,
        emailContact: args.email,
        telephone: args.telephone,
        adminPrincipalUid: uidAdmin,
        exerciceAbonnement: args.exercice,
    });

    for (const avertissement of avertissements) console.log(`  ⚠ ${avertissement}`);

    await db.doc(`cabinets/${codeCabinet}`).set(document);
    console.log(`  cabinets/${codeCabinet} écrit — plan ${document.plan}, `
        + `${document.dossiersUtilises}/${document.quotaDossiers} dossiers, admin ${uidAdmin}`);

    await db.doc(`cabinets/${codeCabinet}/membres/${uidAdmin}`)
        .set(membreAdmin(uidAdmin, args.nomAdmin || codeCabinet, args.email));
    console.log(`  cabinets/${codeCabinet}/membres/${uidAdmin} écrit — role ADMIN`);

    console.log(`\n  seven7_cabinets/${codeCabinet} (ancien schéma) n'a pas été modifié ni supprimé.`);
    console.log(`  L'ancien accès reste fonctionnel pendant la période de transition (phase 3).`);
    console.log(`=== Migration de ${codeCabinet} terminée ===\n`);
}

const args = lireArguments(process.argv.slice(2));
migrer(args).catch((erreur) => {
    console.error(`\n✖ Migration interrompue : ${erreur.message}`);
    process.exitCode = 1;
});
