# SEVEN7 AUDIT — Mémoire de session (claudecode_memory.md)

Outil d'audit externe automatisé, référentiel **SYSCOHADA révisé / OHADA**, en production avec de vrais cabinets clients. Déployé sur Firebase Hosting (`app.seven7.ci` / `seven7-audit.web.app`, projet Firebase `seven7-audit`).

---

## 1. ARCHITECTURE ET FRAMEWORK

- **JavaScript vanille pur**, aucun framework (pas de React/Vue/Node backend). Portée globale (`var`/`function` au top-level), pas de modules ES dans l'app elle-même.
- **Structure des fichiers sources** :
  - `src/js/` — 50 fichiers numérotés (`01-noyau.js` → `50-detection-syscohada.js`), chacun une responsabilité (moteur de calcul, un groupe d'onglets, une fonctionnalité transverse). L'ordre des fichiers dans `build/manifeste.json` fait foi pour l'ordre de concaténation — **l'ordre compte** : les modules qui injectent des onglets (36, 47…) doivent charger avant `44-vue-onglets.js` (le regroupeur de navigation), et les modules qui redéfinissent des fonctions d'un module « étape 1 » (ex. `25-moteur-etape2.js` redéfinit ce que pose `20-liasse-moteur-origine.js`) doivent charger après.
  - `src/app.html` — le template HTML unique (markers `/* @@NOM@@ */` substitués au build).
  - `build/build.mjs` — concatène tout ça en **un seul fichier** `dist/seven7-app_v2_9_NAV-ECLATEE.html` (le vrai livrable déployé), plus `dist/index.html`, `manifest.json`, `sw.js` (PWA).
  - `build/manifeste.json` — la liste ordonnée des fichiers JS à injecter.
  - `build/version.mjs` — écrit `src/js/00-version.js` (bandeau « v2.9.0 · hash · date ») ; **volontaire**, pas auto-généré à chaque build (sinon `npm run verifier` ne pourrait rien comparer). À lancer avant de figer une livraison : `npm run estampiller && npm run build`.
- **Firebase** : Firestore et Auth appelés **directement côté client** (pas de backend Node intermédiaire). Règles testées via `firestore.rules` + émulateur (`npm run emulateur` / `emulateur:complet`) — sans JDK installé, ces tests sont **skip** (89 tests systématiquement skippés dans la suite, ce n'est pas une régression).
- **Tests** : `tests/*.test.js`, Node `--test` natif (pas de Jest/Mocha). `npm test` lance tout (`node --test --test-concurrency=1 "tests/**/*.test.js"`). Deux styles de harnais (`tests/harness.js`) :
  - `chargerApplication()` + `vm` sandboxé pour les tests purs moteur (rapide, pas de DOM).
  - `JSDOM` (`runScripts:'dangerously'`, `pretendToBeVisual:true`) pour les tests DOM/UI — **toujours appeler `d.window.close()` en fin de test**, sinon un timer réel non stubbé (ex. la session-inactivité 30 min de `46-session-inactivite.js`) peut faire tourner le processus de test en tâche de fond pendant 30 minutes si une assertion échoue avant le `close()`.
  - Fixture réelle disponible : `balancesMTTCI()` (balances N/N-1 d'un vrai dossier anonymisé) + `liasseReference()` (valeurs DGI attendues) — **le test à faire passer avant toute livraison** (`tests/liasse.test.js`).
- **Sécurité chaîne d'approvisionnement pnpm** : `pnpm-workspace.yaml` avec `minimumReleaseAge: 10080` (= **7 jours**, quarantaine avant qu'un package pnpm publié soit installable), `minimumReleaseAgeStrict:false`, exclusions pour `react`/`react-dom`, et `allowBuilds` explicite pour `@firebase/util` et `protobufjs` (scripts natifs autorisés nommément, pas en aveugle).
- **Déploiement** : `npx firebase deploy --only hosting:app` (cible juste l'app, pas la vitrine). Toujours confirmer avec l'utilisateur avant de déployer — production réelle, `Cache-Control: no-cache, no-store, must-revalidate` ⇒ tout changement est instantané pour tous les cabinets.
- **PWA / cache** : `dist/sw.js` est **« réseau d'abord »**, jamais cache-first — testé explicitement (`tests/mobile.test.js`). Ce n'est donc jamais la cause d'un « ça ne se met pas à jour » ; si l'utilisateur signale ce symptôme, chercher un autre coupable (ex. `localStorage` auto-persisté au chargement, voir §4).

---

## 2. ÉTAT ACTUEL DU PROJET

### Navigation (a → u)
La navigation logique est regroupée en 21 lettres + une section « Références », définies dans `44-vue-onglets.js` (`VUE_ONGLETS_CATEGORIES`) :

`a` Fiche d'identification · `b` Faits marquants · `c` Évaluation des risques (Risque du CI, Risque Inhérent, Cartographie des risques, Continuité) · `d` Planification · `e` Balance générale (N, N-1) · `f` Balance tiers (fournisseurs, clients) · `g` Tiers à circulariser · `h` États financiers (Bilan, Résultat, revue, détection) · `i` Comptes à auditer · `j` Grand livre · `k` Grand livre sondage · `l` Revue fiscale & sociale / Impôts et taxes · `m` Analyses des provisions · `n` Estimations comptables · `o` Événements postérieurs · `p` Vérifications spécifiques & obligations · `q` Communication à la gouvernance · `r` Note de synthèse · `s` Traitement de la réponse à la note de synthèse · `t` Choix de l'opinion à opérer · `u` Rapport · `ref` Références (PCG, référentiel).

**Important — ceci est un regroupement de NAVIGATION uniquement** : chaque onglet garde son identifiant d'origine, sa sauvegarde Firestore par onglet, et tout son code de calcul intact. Une lettre qui réunit plusieurs onglets historiques affiche plusieurs boutons distincts, pas un panneau fusionné.

**Disposition visuelle actuelle (a beaucoup bougé, plusieurs itérations)** : barre horizontale de 3 boutons Phase 1/2/3 au-dessus de la zone de travail (PAS une colonne latérale — une sidebar verticale a été tentée le 21/08 puis abandonnée après retours utilisateur). Cliquer sur une phase ouvre un **bloc horizontal** listant ses onglets alignés à plat, sans regroupement par catégorie par défaut (le toggle « Vue réduite par catégorie » existe mais est **désactivé par défaut** — voir bug corrigé en §4 sur l'auto-persistance de ce réglage). En-tête fixe (`position:sticky`) : `#collab-bar` (paramètres de connexion) en haut, `.header` (logo/titre) juste en dessous, offsets recalculés en JS via `ResizeObserver` (`ajusterOffsetsEntete()` dans `01-noyau.js`, variables CSS `--collab-bar-h`/`--top-total-h`).

### Nettoyage de balance à 4 chiffres
À l'import CSV (`45-securite-import.js`), un filtre retire les **comptes de centralisation** (racines à 1-3 chiffres, ex. « 40 » seul, sans sous-compte) — ne s'applique qu'à l'import fichier, pas au collage manuel historique. Validation en amont : extension `.csv`, type MIME accepté, 5 Mo max, lecture unique sans conserver le texte brut en mémoire au-delà du traitement.

### Sécurité pnpm
Voir §1 — quarantaine de 7 jours + `allowBuilds` nommé.

### Fonctionnalités livrées et fonctionnelles
- Moteur Bilan / Compte de Résultat / TFT complet, aligné sur la planche DGI officielle (`31-moteur-unifie.js` + `25-moteur-etape2.js`).
- Tableaux fiscaux (onglet l) : TVA (mensuel + section Crédit de TVA fidèle à la feuille « TVA DUE-CREDIT TVA »), ITS(447) mensuel + ITS(6413,6414,6415) annuel, Autres Impôts Mensuels, PATENTE(64;44), CNPS, CMU, **IRVM et BIC** (structure établie par recherche DGI, feuilles source vides dans le fichier fourni par le cabinet).
- **Rapprochement fiscal automatisé** (`48-tableaux-fiscaux.js`) :
  - Solde Initial extrait automatiquement de la balance d'ouverture (comptes 443/445 pour la TVA, 4471-4474 pour ITS/CE/TA/TFPC) — lecture seule, plus de saisie manuelle.
  - Rapprochement **annuel** Comptabilité/Déclaré avec écart + alerte 🟠 : ITS/CE/TA/TFPC (4471-4474), CNPS (4311+4312), Patente (6412, formule **Écart = Déclaration − Comptabilité**).
  - Rapprochement **mensuel** via le Grand Livre (seule source datée de l'app) : TVA et ITS/CE/TA/TFPC, cellule déclarée surlignée + infobulle si elle diverge du mouvement du mois.
  - Impôts Groupe 2 (TSE/AIRSI/PPSI/BNC) et CMU isolée restent **manuels** — comptes non fournis par le cabinet, volontairement pas devinés.
- **Centralisation des anomalies** (onglet s, `49-centralisation-anomalies.js`) : scanne automatiquement tiers anormaux, écart de patente, écarts fiscaux (annuels + mensuels), anomalies de codification SYSCOHADA (voir ci-dessous), points de contrôle interne à risque, + signalements manuels. Alimente aussi `rapConstatations()` (fondement d'une opinion avec réserve).
- **Détection des erreurs de codification SYSCOHADA** (`50-detection-syscohada.js`, onglets e/f) : 3 règles déterministes (racine de classe incohérente avec le libellé, compte tiers générique jamais ventilé, incohérence de racine N/N-1 sur un même libellé). Panneau d'alerte avec bouton « Appliquer la re-classification » → reclassification **virtuelle** (jamais de modification de `balanceData` ni du CSV), consommée par `paramResolve()` en priorité, réversible via « Annuler ».
- Module de répartition (`43-repartition.js`) pour les comptes « quote-part » ambigus (2818, 2918, 2919, 2939, 2949, 2928).
- Session collaborative multi-cabinet (Firestore), gestion d'équipe, paliers d'abonnement (STARTER/PRO/CABINET), migration de dossiers.

---

## 3. CHOIX TECHNIQUES ET RÈGLES MÉTIER LOGÉES

- **Mapping SYSCOHADA appliqué** : `PARAM_SPEC` (`src/js/25-moteur-etape2.js`) — table déclarative `{ref: {colonne: {i:[préfixes inclus], e:[exclusions], s:[sens 'SD'/'SC']}}}`, indexée par longueur de préfixe (`paramBuildIndex`), résolue compte par compte (`paramResolve(compte, sd, sc)`) par préfixe le plus long avec repli. C'est le moteur **réellement actif** (charge après et redéfinit l'ancien moteur statique de `20-liasse-moteur-origine.js`, conservé pour compatibilité XML/export).
- **Règle des comptes bifaces** : déjà implémentée nativement dans `PARAM_SPEC`, PAS besoin de coder une règle spéciale à part.
  - Classes 40/41 (fournisseurs/clients) : `BH`/`BI` (Actif) si SD, `DJ`/`DI` (Passif) si SC — via le champ `s:` de la spec.
  - Classes 42/43/44/45/46/47 (personnel, organismes sociaux, État, débiteurs/créditeurs divers) : candidates à la fois pour `BJ` (Actif, Autres créances, si SD) et `DK`/`DM` (Passif, si SC) — arbitrage dynamique par le sens réel du solde à chaque compte, à chaque recalcul.
  - Comptes bancaires 52/53 : bifaces aussi — `BS` (Trésorerie-Actif) si SD, `DR` (Trésorerie-Passif, découvert) si SC.
  - **Compte 56** (crédits de trésorerie/escompte) : jamais mélangé à l'Actif, toujours candidat de la ligne Passif dédiée (`DQ`), conforme à la demande explicite du cabinet.
  - Test de non-régression dédié : `BASCULE` dans `tests/revue-detail.test.js`, vérifié sur au moins 5 comptes réels (fixture MTTCI) qui changent de masse selon leur sens, avec marqueur explicite pour ne pas fausser la lecture des variations.
- **Résultat HAO (classe 8)** : déjà agrégé conformément — 81→RO, 83+85→RP (charges), 82→TN, 84+86+88→TO (produits), `XH = TN+TO-RO-RP` (Résultat HAO), `XI = XG+XH-RQ-RS` (Résultat Net, RQ=87 participation, RS=89 impôts, soustrait en dernier).
- **Conditionnalité de la TVA** : section « Crédit de TVA » grisée et non saisissable si le solde (Totale déclaré − Totale récupéré) est **positif ou nul** (l'entité est redevable, rien à reporter) ; ouverte à la saisie si **négatif** (crédit à reporter). Distinct du suivi mensuel Due/Crédit (bascule automatique par mois selon le même principe de signe).
- **Quarantaine de 7 jours** : voir §1, `pnpm-workspace.yaml`.
- **Bilan Actif — Brut/Amortissements sur les lignes de total** : correction du 22/08 — `computeBilanActif()` (`31-moteur-unifie.js`) affichait `null` pour Brut/Amort sur toute ligne total (AD, AI, AQ, BA, BB, BG, BK, BT, AZ...), alors que le référentiel officiel (`SYSCOHADA_tableaux_correspondance bon.xlsx`, feuille « BILAN ACTIF - MODELE ») porte ces deux colonnes sur **toutes** les lignes sans exception. Les valeurs étaient déjà correctement sommées par `liasseResolveTree()`, seul l'affichage les masquait — corrigé pour toujours exposer `v.brut`/`v.amort`.
- **Reclassification SYSCOHADA virtuelle** : `syscOverrides` (objet `{compte: racineRecommandée}`, persisté en `localStorage` par dossier) consulté par `paramResolve()` **avant** sa résolution normale — le compte se comporte comme s'il commençait par la racine validée, sans jamais toucher `balanceData` ni le CSV. Réversible.
- **Gotchas techniques à retenir** :
  - `querySelector` sur un sélecteur qui matche À LA FOIS un `<td>` et son `<input>` enfant (mêmes attributs `data-*` dupliqués sur les deux) retourne le `<td>` (ordre du document), jamais l'input — bug réel trouvé et corrigé dans `tfRendrePied()` (`48-tableaux-fiscaux.js`) : ne jamais dupliquer les attributs de ciblage sur un conteneur ET son contenu.
  - Un test jsdom qui échoue une assertion AVANT `d.window.close()` peut faire tourner un vrai timer non stubbé (30 min) et bloquer tout `npm test` — toujours vérifier qu'une regex/assertion est robuste (ex. `fmt()` utilise un espace insécable comme séparateur de milliers, pas un espace normal — comparer via `w.fmt(n)` plutôt qu'un littéral regex).
  - Une fonctionnalité qui persiste son mode en `localStorage` **au chargement automatique** (pas seulement sur action explicite de l'utilisateur) fige un mauvais défaut dans le navigateur de chaque poste dès le premier chargement — changer la valeur par défaut dans le code ne suffit alors plus, il faut soit renommer la clé de stockage, soit arrêter de persister à l'auto-application (voir le bug « vue réduite par catégorie » corrigé le 22/08, `44-vue-onglets.js`).

---

## 4. RESTE À FAIRE / PROCHAINES ÉTAPES

- **Point ouvert non résolu** : le cabinet a signalé un montant affiché à « 1 » dans le Bilan / Compte de Résultat, sans avoir encore fourni de capture d'écran précise. Une piste sérieuse a été creusée et corrigée (Brut/Amort manquants sur les lignes de total du Bilan Actif, §3) mais **n'est peut-être pas LA cause exacte du « 1 » signalé** — à confirmer avec le cabinet (quel compte, quelle ligne, Bilan ou Résultat) dès qu'une capture arrive.
- **Impôts Groupe 2 (TSE/AIRSI/PPSI/BNC) et CMU isolée** : rapprochement automatique (Solde Initial + Comptabilité/Écart) non implémenté, faute de comptes SYSCOHADA fournis par le cabinet. Si le cabinet donne ces comptes, suivre exactement le même patron que ITS/CE/TA/TFPC dans `TF_COMPTES` (`48-tableaux-fiscaux.js`).
- **BIC et IRVM** : structure construite par recherche sur la pratique fiscale ivoirienne (DGI), PAS recopiée d'un modèle du cabinet (ses feuilles source étaient vides). À faire valider par le cabinet : taux IRVM par défaut (15%), périodicité trimestrielle, comptes de rapprochement proposés (447 pour IRVM, 4494 pour BIC) — ce sont des hypothèses raisonnables, pas des données confirmées.
- **Moteur de détection SYSCOHADA** : les 3 règles couvrent un socle volontairement simple et explicable (pas de NLP/IA). D'autres règles pourraient être ajoutées si le cabinet en formule (ex. immobilisations mal classées, charges vs investissement). Le dictionnaire de mots-clés (`SYSC_MOTS_CLES`) est court et pourrait être enrichi.
- **Pas de PR/branche distante suivie activement** : tout le travail se fait directement sur `master`, commit local puis `firebase deploy`. Il existe un remote GitHub (`jeanmarkonan-pixel/seven7-backend`, branche `master` — **ne jamais toucher à `main`**, qui héberge un site vitrine personnel sans rapport). Le push vers GitHub n'est PAS systématique après chaque commit — seulement si explicitement demandé.
- Aucun bug connu non résolu en dehors du point « 1 » ci-dessus. Dernier `npm test` complet (après la correction Bilan Actif Brut/Amort) : **348/348 tests passent, 0 échec** (89 tests émulateur Firestore skippés, absents faute de JDK — normal, pas une régression). Cette correction Bilan Actif est faite mais **pas encore commitée ni déployée** au moment de la rédaction de ce fichier — vérifier `git status` en premier dans la nouvelle session pour savoir si c'est encore le cas.

---

## 5. INSTRUCTION POUR LES FUTURES SESSIONS

Si tu lis ce fichier au début d'une nouvelle session : le contexte de conversation précédent a été effacé volontairement par l'utilisateur pour économiser des tokens, **pas parce que le projet est terminé**. Traite ce fichier comme une reprise de contexte, pas comme un historique figé — **vérifie toujours l'état réel du code** (`git log`, `git status`, lire les fichiers cités) avant d'agir sur la base d'une affirmation de ce document : le code a pu changer depuis sa rédaction.

Règles de collaboration à respecter dès le premier message, sans que l'utilisateur ait à les répéter :
1. **Ne jamais lancer `firebase deploy` sans confirmation explicite de l'utilisateur**, à chaque fois — c'est une application de production avec de vrais cabinets clients. Toujours faire tourner `npm test` (suite complète) avant de proposer un déploiement, et rapporter le résultat exact (X/X, pas d'approximation).
2. Avant tout revert/annulation : montrer `git log` pour identifier le(s) commit(s), montrer le `git diff`, restaurer chirurgicalement les lignes concernées plutôt qu'un `git revert` en bloc si le commit mélange plusieurs changements.
3. L'utilisateur (Jean Marc Konan, cabinet SEVEN7) n'est pas développeur — il communique en français, parfois en MAJUSCULES quand pressé ou frustré, et teste sur l'application réelle déployée plutôt que de lire du code. Ses rapports de bug décrivent fidèlement ce qu'il observe, mais son hypothèse sur la cause peut être fausse — toujours vérifier par le code/les tests avant de corriger à l'aveugle.
4. Pour tout sujet touchant au calcul comptable (Bilan, Résultat, TFT, rapprochements fiscaux), vérifier d'abord contre `tests/liasse.test.js` et la fixture MTTCI avant de modifier quoi que ce soit — c'est le filet de sécurité qui existe précisément pour éviter de casser un calcul en production.
5. Ce fichier a été demandé pour économiser des tokens sur une session très longue — une fois la nouvelle session avancée, si l'utilisateur redemande une mise à jour de ce fichier, le réécrire entièrement (pas de patch incrémental) pour qu'il reste un résumé cohérent et à jour, pas un empilement daté d'ajouts.
