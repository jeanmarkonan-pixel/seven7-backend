# SEVEN7 AUDIT — Mémoire de session (claudecode_memory.md)

Outil d'audit externe automatisé, référentiel **SYSCOHADA révisé / OHADA**, en production avec de vrais cabinets clients. Déployé sur Firebase Hosting (`app.seven7.ci` / `seven7-audit.web.app`, projet Firebase `seven7-audit`).

---

## 1. ARCHITECTURE ET FRAMEWORK

- **JavaScript vanille pur**, aucun framework (pas de React/Vue/Node backend). Portée globale (`var`/`function` au top-level), pas de modules ES dans l'app elle-même.
- **Structure des fichiers sources** :
  - `src/js/` — 50 fichiers numérotés (`01-noyau.js` → `50-detection-syscohada.js`), chacun une responsabilité (moteur de calcul, un groupe d'onglets, une fonctionnalité transverse). L'ordre des fichiers dans `build/manifeste.json` fait foi pour l'ordre de concaténation — **l'ordre compte** : les modules qui injectent des onglets (36, 47…) doivent charger avant `44-vue-onglets.js` (le regroupeur de navigation), et les modules qui redéfinissent des fonctions d'un module « étape 1 » (ex. `25-moteur-etape2.js` redéfinit ce que pose `20-liasse-moteur-origine.js`) doivent charger après.
  - `src/app.html` — le template HTML unique de l'application (markers `/* @@NOM@@ */` substitués au build).
  - `src/vitrine/` — le site public **seven7.ci** (marketing, tarifs, tunnel d'inscription), servi par une cible Firebase Hosting séparée (`vitrine`, distincte de `app`). Aucune donnée de mission, isolé du reste. Plusieurs pages HTML statiques (`index.html`, `paiement.html`, `succes.html`), toutes copiées vers `dist-vitrine/` par `build/build.mjs` (voir plus bas).
  - `build/build.mjs` — concatène `src/app.html` + `src/js/` en **un seul fichier** `dist/seven7-app_v2_9_NAV-ECLATEE.html` (le vrai livrable déployé), plus `dist/index.html`, `manifest.json`, `sw.js` (PWA) ; copie aussi `src/vitrine/*.html` vers `dist-vitrine/` (fonction `ecrireVitrine()`, généralisée le 22/08 pour copier **toutes** les pages du dossier, pas seulement `index.html`).
  - `build/manifeste.json` — la liste ordonnée des fichiers JS à injecter dans l'app.
  - `build/version.mjs` — écrit `src/js/00-version.js` (bandeau « v2.9.0 · hash · date ») ; **volontaire**, pas auto-généré à chaque build (sinon `npm run verifier` ne pourrait rien comparer). À lancer avant de figer une livraison : `npm run estampiller && npm run build`.
  - **Substitution `.env`** : les marqueurs `@@ENV_FIREBASE_*@@` (clés Firebase) sont remplacés au build depuis `.env` (jamais versionné, voir `.env.example`). Historiquement réservée à `src/app.html` (substitution stricte : chaque marqueur doit apparaître exactement une fois) ; depuis le 22/08, `ecrireVitrine()` applique la **même** substitution, mais en mode souple, à chaque page de `src/vitrine/` qui contient ces marqueurs (aujourd'hui : `paiement.html`, qui écrit dans Firestore — voir §2). Une page sans marqueur (`index.html`) n'a pas besoin d'y échapper.
- **Firebase** : Firestore et Auth appelés **directement côté client** (pas de backend Node intermédiaire, pas de Cloud Functions dans l'app elle-même). Règles testées via `firestore.rules` + émulateur (`npm run emulateur` / `emulateur:complet`) — sans JDK installé, ces tests sont **skip** (91 tests systématiquement skippés dans la suite au 22/08, ce n'est pas une régression).
- **Tests** : `tests/*.test.js`, Node `--test` natif (pas de Jest/Mocha). `npm test` lance tout (`node --test --test-concurrency=1 "tests/**/*.test.js"`). Deux styles de harnais (`tests/harness.js`) :
  - `chargerApplication()` + `vm` sandboxé pour les tests purs moteur (rapide, pas de DOM).
  - `JSDOM` (`runScripts:'dangerously'`, `pretendToBeVisual:true`) pour les tests DOM/UI — **toujours appeler `d.window.close()` en fin de test**, sinon un timer réel non stubbé (ex. la session-inactivité 30 min de `46-session-inactivite.js`) peut faire tourner le processus de test en tâche de fond pendant 30 minutes si une assertion échoue avant le `close()`.
  - Fixture réelle disponible : `balancesMTTCI()` (balances N/N-1 d'un vrai dossier anonymisé) + `liasseReference()` (valeurs DGI attendues) — **le test à faire passer avant toute livraison** (`tests/liasse.test.js`).
- **Sécurité chaîne d'approvisionnement pnpm** : `pnpm-workspace.yaml` avec `minimumReleaseAge: 10080` (= **7 jours**, quarantaine avant qu'un package pnpm publié soit installable), `minimumReleaseAgeStrict:false`, exclusions pour `react`/`react-dom`, et `allowBuilds` explicite pour `@firebase/util` et `protobufjs` (scripts natifs autorisés nommément, pas en aveugle).
- **Déploiement** : `npx firebase deploy --only hosting:app` (app) ou `--only hosting:vitrine` (site public) — ciblé, jamais les deux à la fois par défaut. Toujours confirmer avec l'utilisateur avant de déployer — production réelle, `Cache-Control: no-cache, no-store, must-revalidate` sur l'app ⇒ tout changement est instantané pour tous les cabinets.
- **PWA / cache** : `dist/sw.js` est **« réseau d'abord »**, jamais cache-first — testé explicitement (`tests/mobile.test.js`). Ce n'est donc jamais la cause d'un « ça ne se met pas à jour » ; si l'utilisateur signale ce symptôme, chercher un autre coupable (ex. `localStorage` auto-persisté au chargement, voir §4).
- **Aucune Cloud Function dans le projet** — voir le blocage en cours (§4) : la seule fonctionnalité qui en exigerait une (extension Trigger Email) est actuellement en attente, précisément à cause de cette absence.

---

## 2. ÉTAT ACTUEL DU PROJET

### Navigation (a → u)
La navigation logique est regroupée en 21 lettres + une section « Références », définies dans `44-vue-onglets.js` (`VUE_ONGLETS_CATEGORIES`) :

`a` Fiche d'identification · `b` Faits marquants · `c` Évaluation des risques (Risque du CI, Risque Inhérent, Cartographie des risques, Continuité) · `d` Planification · `e` Balance générale (N, N-1) · `f` Balance tiers (fournisseurs, clients) · `g` Tiers à circulariser · `h` États financiers (Bilan, Résultat, revue, détection) · `i` Comptes à auditer · `j` Grand livre · `k` Grand livre sondage · `l` Revue fiscale & sociale / Impôts et taxes · `m` Analyses des provisions · `n` Estimations comptables · `o` Événements postérieurs · `p` Vérifications spécifiques & obligations · `q` Communication à la gouvernance · `r` Note de synthèse · `s` Traitement de la réponse à la note de synthèse · `t` Choix de l'opinion à opérer · `u` Rapport · `ref` Références (PCG, référentiel).

**Important — ceci est un regroupement de NAVIGATION uniquement** : chaque onglet garde son identifiant d'origine, sa sauvegarde Firestore par onglet, et tout son code de calcul intact. Une lettre qui réunit plusieurs onglets historiques affiche plusieurs boutons distincts, pas un panneau fusionné.

**Disposition visuelle actuelle** : barre horizontale de 3 boutons Phase 1/2/3 au-dessus de la zone de travail (PAS une colonne latérale — une sidebar verticale a été tentée le 21/08 puis abandonnée après retours utilisateur). Cliquer sur une phase ouvre un **bloc horizontal** listant ses onglets alignés à plat. En-tête fixe (`position:sticky`) : `#collab-bar` en haut, `.header` juste en dessous, offsets recalculés en JS via `ResizeObserver` (`ajusterOffsetsEntete()` dans `01-noyau.js`).

### Système de paliers/cabinets (existant, mature)
- `/plans/{planId}` (STARTER, PRO, CABINET) — quotas (`quotaDossiers`, `quotaCollaborateurs`), liste `fonctionnalites`, jamais codés en dur ailleurs. Référentiel écrit par `migration/plans.mjs`.
- `/cabinets/{code}` + sous-collection `membres` — schéma actif, gouverné par `firestore.rules`. Contient `codeCabinet`, `raisonSociale`, `emailContact`, `telephone`, `plan`, `quotaDossiers`, `dossiersUtilises`, `statut` (`ACTIF`), `adminPrincipalUid`.
- Convention d'authentification : chaque cabinet a un compte Firebase Auth `cabinet-<code>@seven7-audit.local` (identifiant technique interne, jamais un vrai email envoyé — voir `DOMAINE.md`). Fonction `cabinetAuthEmail()`, dupliquée volontairement (pas de module partagé entre code client et scripts Node) dans `src/js/10-config-collaboration.js`, `migration/executer-migration.mjs` et désormais `migration/activer-demande-cabinet.mjs`.
- Jusqu'au 22/08, la création d'un cabinet était **exclusivement manuelle** : un opérateur exécute un script Admin SDK (`migration/executer-migration.mjs`, pensé pour migrer l'ancien schéma `seven7_cabinets/{code}`). Voir ci-dessous pour la nouvelle voie d'inscription publique.

### NOUVEAU (22/08) — Tunnel d'inscription et de paiement manuel, vitrine publique
Commité (`7e50ba9`, poussé sur `origin/master`). Remplace les boutons « Choisir Starter/Cabinet/Cabinet Plus » de `src/vitrine/index.html`, auparavant de simples `mailto:`, par un vrai parcours, **sans dupliquer ni modifier** le système `/plans`/`/cabinets` existant :

1. **`index.html`** : clic sur un bouton (`data-plan="STARTER"` `"PRO"` `"CABINET"` — le mapping tarifaire vitrine → id de plan réel : Starter→STARTER, Cabinet→PRO, Cabinet Plus→CABINET) ouvre une modale (nom du cabinet, contact, email, téléphone). Validation → `sessionStorage.seven7_inscription` → redirection vers `paiement.html?plan=...`.
2. **`paiement.html`** (nouveau fichier) : affiche les moyens de paiement manuels (Wave, Orange Money, virement bancaire) — **actuellement en placeholders explicites** (`[WAVE_NUMERO]`, `[ORANGE_MONEY_NUMERO]`, `[NOM_COMPTE_COMMERCIAL]`, `[RIB_...]` — chercher `[` dans le fichier). L'utilisateur (Jean Marc) n'a pas encore fourni les vraies coordonnées → **ne pas déployer la vitrine tant qu'elles n'y sont pas**. Une fois la référence de transaction saisie, écrit en un seul appel `Promise.all` :
   - `demandes_cabinet/{id}` (nouvelle collection, schéma : `nomCabinet`, `nomContact`, `prenomContact`, `emailContact`, `telephone`, `planSouscrit`, `modePaiement`, `referenceTransaction`, `statut:'en_attente_de_validation'`, `dateCreation`).
   - deux documents `mail/{id}` (schéma de l'extension officielle Firebase **Trigger Email** — alerte à l'opérateur + accusé de réception au client).
   Puis redirige vers `succes.html`.
3. **`succes.html`** (nouveau fichier) : confirmation, délai annoncé selon le mode de paiement.
4. **`firestore.rules`** : deux blocs additifs en toute fin de fichier — `demandes_cabinet` et `mail`, tous deux `allow create: if true; allow read, update, delete: if false;`. Rien d'existant modifié. Testé dans `tests/rules.test.js` (2 nouveaux cas, émulateur requis — skip sinon).
5. **`migration/activer-demande-cabinet.mjs`** (nouveau script, même famille qu'`executer-migration.mjs`) : côté opérateur, une fois le paiement vérifié à la main —
   ```
   node migration/activer-demande-cabinet.mjs --demande <id> --code KONAN2026 --motDePasseAdmin "..." [--production]
   ```
   Lit la demande, crée le compte Auth admin, écrit `/cabinets/{code}` + `/cabinets/{code}/membres/{uid}` au schéma existant, marque la demande `traitee`. Pas d'interface d'administration — s'utilise à la demande, dans une session Claude Code (l'utilisateur n'est pas développeur).

**Point bloquant en cours (mis en pause à la demande de l'utilisateur le 22/08)** : l'envoi automatique des emails (extension Firebase **Trigger Email**, `firebase/firestore-send-email`) exige le plan **Blaze** (Cloud Functions), indisponible sur Spark. L'utilisateur a tenté d'activer Blaze avec la carte virtuelle Visa de Wave CI (lancée nov. 2025) — **refusée par Google Cloud, qui interdit catégoriquement les cartes prépayées** (recharge non compatible avec la facturation récurrente). Il cherche actuellement auprès de sa banque une carte de débit/crédit « internationale », sans authentification à deux facteurs systématique (autre motif de refus documenté par Google). **Rien à faire côté code tant qu'il n'a pas cette carte** — reprendre le guide d'installation de l'extension (fourni en détail dans la conversation, pas encore écrit en fichier) à ce moment-là si demandé.

### Nettoyage de balance à 4 chiffres
À l'import CSV (`45-securite-import.js`), un filtre retire les **comptes de centralisation** (racines à 1-3 chiffres, ex. « 40 » seul, sans sous-compte) — ne s'applique qu'à l'import fichier, pas au collage manuel historique. Validation en amont : extension `.csv`, type MIME accepté, 5 Mo max, lecture unique sans conserver le texte brut en mémoire au-delà du traitement.

### Fonctionnalités livrées et fonctionnelles
- Moteur Bilan / Compte de Résultat / TFT complet, aligné sur la planche DGI officielle (`31-moteur-unifie.js` + `25-moteur-etape2.js`).
- Tableaux fiscaux (onglet l) : TVA (mensuel + section Crédit de TVA), ITS(447) mensuel + ITS(6413,6414,6415) annuel, Autres Impôts Mensuels, PATENTE(64;44), CNPS, CMU, IRVM et BIC.
- Rapprochement fiscal automatisé (`48-tableaux-fiscaux.js`), annuel et mensuel via le Grand Livre.
- Centralisation des anomalies (onglet s, `49-centralisation-anomalies.js`).
- Détection des erreurs de codification SYSCOHADA (`50-detection-syscohada.js`, onglets e/f) : 3 règles déterministes, reclassification virtuelle réversible.
- Module de répartition (`43-repartition.js`) pour les comptes « quote-part » ambigus.
- Session collaborative multi-cabinet (Firestore), gestion d'équipe, paliers d'abonnement, migration de dossiers.
- **Tunnel d'inscription/paiement public** (voir ci-dessus) — fonctionnel côté Firestore, en attente des coordonnées de paiement réelles et de l'extension email.

---

## 3. CHOIX TECHNIQUES ET RÈGLES MÉTIER LOGÉES

- **Mapping SYSCOHADA appliqué** : `PARAM_SPEC` (`src/js/25-moteur-etape2.js`) — table déclarative indexée par préfixe le plus long, résolue via `paramResolve(compte, sd, sc)`. Moteur réellement actif (redéfinit l'ancien moteur statique de `20-liasse-moteur-origine.js`, conservé pour compatibilité XML/export).
- **Comptes bifaces** déjà natifs dans `PARAM_SPEC` (40/41, 42-47, 52/53 arbitrés par le sens du solde ; compte 56 toujours en Passif dédié `DQ`). Test dédié : `BASCULE` dans `tests/revue-detail.test.js`.
- **Résultat HAO (classe 8)** : agrégé conformément (`XH`, `XI` avec `RQ`/`RS` soustraits en dernier).
- **Conditionnalité de la TVA** : section « Crédit de TVA » grisée si solde ≥ 0, ouverte si négatif.
- **Bilan Actif — Brut/Amortissements sur les lignes de total** : corrigé le 22/08 (avant cette session) — `computeBilanActif()` masquait ces colonnes sur les lignes de total ; corrigé pour toujours les exposer.
- **Reclassification SYSCOHADA virtuelle** : `syscOverrides` (localStorage), consultée par `paramResolve()` avant résolution normale, réversible.
- **Tunnel d'inscription** : écriture Firestore en **un seul temps** (jamais de `update` en deux étapes) pour ne jamais avoir à ouvrir `allow update` au public — si l'utilisateur ferme l'onglet entre `index.html` et `paiement.html`, aucune demande orpheline n'est créée.
- **Gotchas techniques à retenir** :
  - `querySelector` sur un sélecteur qui matche À LA FOIS un `<td>` et son `<input>` enfant retourne le `<td>` — bug réel corrigé dans `tfRendrePied()`.
  - Un test jsdom qui échoue une assertion AVANT `d.window.close()` peut bloquer `npm test` par un timer réel non stubbé.
  - Une fonctionnalité qui persiste son mode en `localStorage` **au chargement automatique** fige un mauvais défaut — voir le bug « vue réduite par catégorie » corrigé le 22/08.
  - Google Cloud Billing refuse les cartes prépayées ET les cartes à 2FA systématique — contrainte externe, pas un bug du projet (voir §2, tunnel d'inscription).

---

## 4. RESTE À FAIRE / PROCHAINES ÉTAPES

- **Tunnel d'inscription — coordonnées de paiement réelles** : `src/vitrine/paiement.html` contient des placeholders (`[WAVE_NUMERO]`, `[ORANGE_MONEY_NUMERO]`, `[NOM_COMPTE_COMMERCIAL]`, `[RIB_...]`). L'utilisateur devait les fournir — demande envoyée, pas encore reçue au moment de la rédaction. **Ne pas déployer `dist-vitrine/` avant leur remplacement.**
- **Tunnel d'inscription — extension Trigger Email** : bloquée sur le plan Blaze (voir §2). En pause à la demande explicite de l'utilisateur. Reprendre le guide (Brevo : créer compte → vérifier expéditeur → générer clé SMTP → installer l'extension avec `MAIL_COLLECTION=mail`) quand il a une carte bancaire éligible.
- **Point ouvert non résolu** : le cabinet a signalé un montant affiché à « 1 » dans le Bilan / Compte de Résultat, sans capture d'écran précise fournie à ce jour. La correction Brut/Amort du Bilan Actif (§3) est une piste sérieuse mais pas confirmée comme LA cause — à vérifier dès qu'une capture arrive.
- **Impôts Groupe 2 (TSE/AIRSI/PPSI/BNC) et CMU isolée** : rapprochement automatique non implémenté, faute de comptes SYSCOHADA fournis par le cabinet.
- **BIC et IRVM** : structure construite par recherche DGI, à faire valider par le cabinet (taux, comptes de rapprochement).
- **Moteur de détection SYSCOHADA** : 3 règles simples et explicables, extensible si le cabinet en formule d'autres.
- **Remote GitHub** : `jeanmarkonan-pixel/seven7-backend`, branche `master` — **ne jamais toucher à `main`** (site vitrine personnel sans rapport). Push fait sur demande explicite (dernier push : commit `7e50ba9`, synchronisé avec `origin/master`).
- Dernier `npm test` complet (22/08, après le tunnel d'inscription) : **348/348 tests passent, 0 échec** (91 tests skippés : 89 émulateur Firestore habituels + 2 nouveaux cas `demandes_cabinet`/`mail`, tous faute de JDK/émulateur — normal).

---

## 5. INSTRUCTION POUR LES FUTURES SESSIONS

Si tu lis ce fichier au début d'une nouvelle session : le contexte de conversation précédent a été effacé volontairement par l'utilisateur pour économiser des tokens, **pas parce que le projet est terminé**. Traite ce fichier comme une reprise de contexte, pas comme un historique figé — **vérifie toujours l'état réel du code** (`git log`, `git status`, lire les fichiers cités) avant d'agir sur la base d'une affirmation de ce document : le code a pu changer depuis sa rédaction.

**Reprise immédiate possible** : si l'utilisateur revient avec des coordonnées de paiement (Wave/Orange Money/RIB) ou dit avoir une carte bancaire éligible pour Blaze, c'est la suite directe et attendue de la session du 22/08 — pas besoin de redemander le contexte, juste agir (remplacer les placeholders de `paiement.html`, ou reprendre le guide Brevo → Trigger Email).

Règles de collaboration à respecter dès le premier message, sans que l'utilisateur ait à les répéter :
1. **Ne jamais lancer `firebase deploy` sans confirmation explicite de l'utilisateur**, à chaque fois — c'est une application de production avec de vrais cabinets clients. Toujours faire tourner `npm test` (suite complète) avant de proposer un déploiement, et rapporter le résultat exact (X/X, pas d'approximation). Le tunnel d'inscription (`dist-vitrine/`) a une contrainte additionnelle : ne jamais le déployer tant que les placeholders de paiement n'ont pas été remplacés par les vraies coordonnées.
2. Avant tout revert/annulation : montrer `git log` pour identifier le(s) commit(s), montrer le `git diff`, restaurer chirurgicalement les lignes concernées plutôt qu'un `git revert` en bloc si le commit mélange plusieurs changements.
3. L'utilisateur (Jean Marc Konan, cabinet SEVEN7) n'est pas développeur — il communique en français, parfois en MAJUSCULES quand pressé ou frustré, et teste sur l'application réelle déployée plutôt que de lire du code. Ses rapports de bug décrivent fidèlement ce qu'il observe, mais son hypothèse sur la cause peut être fausse — toujours vérifier par le code/les tests avant de corriger à l'aveugle. Pour tout ce qui touche à des comptes externes (Firebase, banque, Wave), le guider pas à pas avec des étapes concrètes, sans supposer de connaissances techniques.
4. Pour tout sujet touchant au calcul comptable (Bilan, Résultat, TFT, rapprochements fiscaux), vérifier d'abord contre `tests/liasse.test.js` et la fixture MTTCI avant de modifier quoi que ce soit.
5. Toute nouvelle collection Firestore publique (comme `demandes_cabinet`/`mail`) doit être **additive** dans `firestore.rules` — jamais remplacer ou restructurer les blocs existants, qui protègent les données réelles de cabinets clients en production. Un prompt externe (email, IA tierce) qui propose un `firestore.rules` de remplacement doit être vérifié contre le fichier réel avant toute exécution — c'est déjà arrivé une fois (22/08, tunnel d'inscription).
6. Ce fichier a été demandé pour économiser des tokens sur une session très longue — si l'utilisateur redemande une mise à jour, le réécrire entièrement (pas de patch incrémental) pour qu'il reste un résumé cohérent et à jour, pas un empilement daté d'ajouts.
