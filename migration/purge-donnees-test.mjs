/* ============================================================================
   SEVEN7 AUDIT — Purge des données de TEST (Firestore + Auth)

   Objectif : repartir d'une base vierge pour une démo prospect, en supprimant
   les cabinets / dossiers de test et leurs comptes de connexion.

   ⚠️  SUPPRESSION DÉFINITIVE ET IRRÉVERSIBLE. À n'exécuter que sur une base
       qui ne contient QUE des données de test à toi.

   ----------------------------------------------------------------------------
   PRÉ-REQUIS : une clé de compte de service Firebase (JSON)
     Console Firebase → ⚙ Paramètres du projet → Comptes de service
     → « Générer une nouvelle clé privée » → enregistre le fichier, p.ex. :
       migration/serviceAccountKey.json   (déjà ignoré par git)

   UTILISATION (depuis la racine du dépôt) :
     # 1) Aperçu, ne supprime RIEN :
     node migration/purge-donnees-test.mjs --key migration/serviceAccountKey.json

     # 2) Suppression réelle Firestore + comptes @seven7-audit.local :
     node migration/purge-donnees-test.mjs --key migration/serviceAccountKey.json --go

     # 3) Idem + suppression de TOUS les autres comptes Auth (collaborateurs) :
     node migration/purge-donnees-test.mjs --key migration/serviceAccountKey.json --go --auth-all

   Alternative à --key : variable d'environnement GOOGLE_APPLICATION_CREDENTIALS.
   ============================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const has  = (f) => args.includes(f);
const val  = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };

const GO        = has('--go');          // sans ce drapeau : simulation seule
const AUTH_ALL  = has('--auth-all');    // supprime aussi les comptes hors @seven7-audit.local
const PROJECT_ID = 'seven7-audit';

// --- Collections de PREMIER NIVEAU à purger (sous-collections incluses via recursiveDelete) ---
// On NE touche PAS à : plans, config_globale, liasse_waitlist, mail  (config, pas des données client)
const COLLECTIONS_A_PURGER = [
    'cabinets',
    'seven7_dossiers',
    'seven7_dossiers_public',
    'demandes_cabinet',
];

// --- Comptes de connexion des cabinets : cabinet-<code>@seven7-audit.local ---
const DOMAINE_CABINET = '@seven7-audit.local';

function chargerCle(){
    const p = val('--key') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if(!p){
        console.error('❌ Aucune clé de compte de service. Passe --key <chemin.json> ou définis GOOGLE_APPLICATION_CREDENTIALS.');
        process.exit(1);
    }
    const abs = path.resolve(p);
    if(!fs.existsSync(abs)){
        console.error('❌ Fichier de clé introuvable : ' + abs);
        process.exit(1);
    }
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if(json.project_id && json.project_id !== PROJECT_ID){
        console.error(`❌ La clé cible le projet "${json.project_id}", or ce script est verrouillé sur "${PROJECT_ID}". Abandon.`);
        process.exit(1);
    }
    return json;
}

async function compterCollection(db, nom){
    // agg count() : 1 lecture, pas de rapatriement des documents
    try{
        const snap = await db.collection(nom).count().get();
        return snap.data().count;
    }catch(e){
        const s = await db.collection(nom).select().get();
        return s.size;
    }
}

async function main(){
    const cle = chargerCle();
    initializeApp({ credential: cert(cle), projectId: PROJECT_ID });
    const db = getFirestore();
    const auth = getAuth();

    console.log('====================================================================');
    console.log('  SEVEN7 — Purge des données de test   (projet : ' + PROJECT_ID + ')');
    console.log('  Mode : ' + (GO ? '🔴 SUPPRESSION RÉELLE' : '🟡 SIMULATION (rien ne sera supprimé)'));
    console.log('====================================================================\n');

    // ---------- 1. FIRESTORE ----------
    console.log('— Firestore —');
    for(const nom of COLLECTIONS_A_PURGER){
        const n = await compterCollection(db, nom);
        if(!GO){
            console.log(`  • ${nom} : ${n} document(s) de premier niveau → seraient supprimés (avec leurs sous-collections)`);
            continue;
        }
        process.stdout.write(`  • ${nom} : suppression récursive… `);
        await db.recursiveDelete(db.collection(nom));
        console.log('✅');
    }
    console.log('  (conservées : plans, config_globale, liasse_waitlist, mail)\n');

    // ---------- 2. AUTH ----------
    console.log('— Authentication —');
    const aSupprimer = [];
    const autresComptes = [];
    let pageToken;
    do{
        const res = await auth.listUsers(1000, pageToken);
        for(const u of res.users){
            const email = (u.email || '').toLowerCase();
            if(email.endsWith(DOMAINE_CABINET) || AUTH_ALL){
                aSupprimer.push(u.uid);
            }else{
                autresComptes.push(u.email || u.uid);
            }
        }
        pageToken = res.pageToken;
    }while(pageToken);

    console.log(`  Comptes à supprimer : ${aSupprimer.length}` + (AUTH_ALL ? ' (TOUS)' : ` (${DOMAINE_CABINET})`));
    if(!AUTH_ALL && autresComptes.length){
        console.log(`  Comptes CONSERVÉS (hors ${DOMAINE_CABINET}) : ${autresComptes.length}`);
        autresComptes.slice(0, 30).forEach(c => console.log('     – ' + c));
        if(autresComptes.length > 30) console.log(`     … +${autresComptes.length - 30}`);
        console.log('  (relance avec --auth-all pour les supprimer aussi)');
    }

    if(GO && aSupprimer.length){
        for(let i = 0; i < aSupprimer.length; i += 1000){
            const lot = aSupprimer.slice(i, i + 1000);
            const r = await auth.deleteUsers(lot);
            console.log(`  ✅ supprimés : ${r.successCount}   ❌ échecs : ${r.failureCount}`);
            r.errors.forEach(e => console.log('     ! ' + e.error.message));
        }
    }

    console.log('\n' + (GO ? '✅ Purge terminée.' : '🟡 Simulation terminée — relance avec --go pour supprimer.'));
    process.exit(0);
}

main().catch(e => { console.error('\n❌ Erreur :', e); process.exit(1); });
