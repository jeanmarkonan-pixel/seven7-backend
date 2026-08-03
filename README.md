# SEVEN7 AUDIT — dossier de reprise

Outil d'audit externe sous référentiel **SYSCOHADA révisé / OHADA**, application web autonome
distribuée sous forme d'un fichier HTML unique, hébergée sur Firebase.

Ce dossier contient l'état du code au terme d'une série de travaux menés en conversation,
les modules ajoutés, le script de construction et une **suite de tests de non-régression**
calée sur une liasse fiscale réelle. Il est destiné à être repris dans Claude Code.

---

## 1. Démarrage

```bash
npm install          # @firebase/rules-unit-testing, pour les tests de règles
npm test             # 40 tests — doivent tous passer avant toute livraison
npm run build        # régénère dist/ à partir de src/ (voir §5)
npm run verifier     # dist/ est-il bien à jour de ses sources ?
npm run emulateur    # émulateur Firestore, pour les tests de règles (JDK requis)
```

`jsdom` ne sera nécessaire que le jour où les tests d'interface seront écrits (voir §7).

Le dépôt Git existe depuis le commit `7a27faf`. **Ne modifiez jamais `dist/` à la main** :
c'est un produit de construction, et un test échoue si le fichier ne correspond plus à ses
sources.

---

## 2. Ce qu'il faut savoir avant de toucher au code

### Le livrable est un fichier HTML unique, mais ce n'est plus la source

`dist/seven7-app_v2_9_NAV-ECLATEE.html` — 1,29 Mo, **quatre blocs `<script>` inline**,
tout en variables globales. Le fichier est déployé tel quel sur Firebase Hosting, mais il
est désormais **produit** par `build/build.mjs` à partir de `src/app.html` et des
23 fichiers de `src/js/` (voir §4 et §5).

La portée globale unique est délibérée : tout le HTML produit par `innerHTML` porte des
attributs `onclick` qui appellent les fonctions par leur nom global. Le passage en vrais
modules ES suppose d'exposer explicitement chacune de ces fonctions — faisable, mais pas
sans couverture DOM.

Les seules dépendances externes sont chargées par balise `<script src>` :

| Origine | Rôle |
|---|---|
| `gstatic.com/firebasejs/10.12.2` | SDK Firebase (app, auth, firestore) |
| `cdnjs.cloudflare.com` | lz-string (compression du stockage) |

### La donnée de référence, c'est la liasse MTTCI

`tests/fixtures/` contient les deux balances (N et N-1) et les **états DGI corrigés** de
la société MANUTENTION TRANSIT-TRANSPORT, exercice clos le 31/12/2025, extraits du classeur
`liasse_2025_DGI_ORIGINAL_ET_AUTOMATISEE.xlsm`.

**C'est l'actif le plus précieux du projet.** Ces états ont révélé trois erreurs de mapping
que la lecture littérale de la planche officielle ne permettait pas de détecter. Toute
évolution du moteur comptable doit continuer à les reproduire à l'unité près.

---

## 3. Ce qui a été fait, et pourquoi

### Onglet Liasse → PARAMÈTRES *(nouveau)*

Les tableaux officiels de correspondance postes/comptes du SYSCOHADA révisé
(BILAN actif et passif, COMPTE DE RÉSULTAT, TFT, 15 renvois) sont retranscrits en objets
JavaScript : `PARAM_BILAN_ACTIF`, `PARAM_BILAN_PASSIF`, `PARAM_RESULTAT`, `PARAM_TFT`,
`PARAM_NOTES`.

Ce ne sont pas des tableaux d'affichage : **le moteur les consomme directement**. Corriger
une ligne dans cet onglet corrige l'état généré.

Six blocs : P1a/P1b bilan, P2 résultat, P3 TFT, P4 renvois, P5 contrôle du moteur
(comptes réellement rattachés — la piste d'audit du mapping), P6 écarts assumés entre la
lettre de la planche et le moteur.

### Moteur de calcul de la liasse *(réécrit)*

`liasseGetActif`, `liasseGetPassif`, `liasseGetResultat`, `liasseGetTFTColumn` sont
redéfinis dans `engine_module.js` à partir des specs machine `PARAM_SPEC`.

Trois mécanismes qui n'existaient pas :

1. **Exclusions** — `41 sauf 419`, `24 sauf 245 et 2495`, `40 sauf 409`, `499 sauf 4998`…
2. **Arbitrage par le sens du solde** — les comptes 42/43/44 partent en BJ s'ils sont
   débiteurs, en DK s'ils sont créditeurs ; idem 185/45/46/47 → BJ ou DM, 52/53 → BS ou DR.
3. **TFT sur formules officielles** — les heuristiques précédentes
   (`deltaCA > 0 ? augmentation : prélèvement`, dividendes estimés par différence) ont
   disparu. Le calcul consomme les quatre colonnes de la balance : soldes débiteurs,
   soldes créditeurs, mouvements débit, mouvements crédit. La colonne N-1 utilise les
   colonnes *Ouverture* de la balance N-1, ce qui évite d'exiger une balance N-2.

**Trois divergences assumées avec la planche**, chacune validée numériquement et
documentée dans le bloc P6 :

| Poste | Planche | Moteur | Preuve sur MTTCI |
|---|---|---|---|
| BI / DI | `BI = 41 sauf 419`, `DI = 419` | ventilation par sens du solde | 4181 « Clients, factures à établir » créditeur de 113 822 444 ; la lecture littérale donnait BI = −51 195 089 |
| BH / DJ | `BH = 409`, `DJ = 40 sauf 409` | ventilation par sens du solde | symétrie de la règle clients |
| TFT · FH | lu `mvt débit [26, 279, 4813]` | `[26, 27 (sauf 2714, 276), 4813]` | 2758 « Dépôts et cautionnements », mouvement débit 100 000 000 ; le « 9 » était un renvoi de bas de page |

Une quatrième particularité : **FB, FC et FD sont affichées en variation brute**, pas en
impact trésorerie — convention de la liasse de référence. Le signe est appliqué dans le
total : `ZB = FA − FB − FC − FD + FE`.

### Onglet Détection des erreurs → §4 et §5 *(nouveau)*

**§4 — Analyse par cycle.** Onze cycles (`CYCLES` dans `cycles_module.js`), un tableau
chacun, sept tests par sous-compte :

| Test | Détecte | Gravité |
|---|---|---|
| T1 | ouverture + mouvements ≠ solde de clôture | Critique |
| T2 | clôture N-1 ≠ ouverture N | Critique |
| T3 | sens du solde contraire au fonctionnement PCG | Majeur |
| T4 | solde qui varie sans aucun mouvement | Critique |
| T5 | compte nouveau absent de N-1 | Mineur |
| T6 | contrôles propres au cycle | variable |
| T7 | compte soldé en N-1, absent de N | Majeur |

Les comptes 11/12/13 sont traités à part sur T2 et T4 : leur variation aux à-nouveaux vient
de l'affectation du résultat, ce n'est pas une rupture de continuité.

Chaque cycle affiche en tête ses rapprochements croisés. Trois sont bloquants et sortent à
écart nul sur MTTCI : dotations 681 = variation des amortissements 28 · variation de la
trésorerie classe 5 = ZG du TFT · variation du report à nouveau 12 = résultat net N-1.

**§5 — Revue des variations.** Ligne par sous-compte, avec double seuil (montant **et**
pourcentage), rattachement au poste de liasse, commentaire auditeur persistant et export CSV.
Les numéros de compte en doublon dans la balance N reçoivent un tag et ne sont rattachés à
aucun solde N-1 — le rapprochement est impossible sans lever l'ambiguïté.

### Onglet Synthèse → mémo de travail *(refondu)*

Dix sections en mise en page de note de cabinet, quatre alimentées automatiquement :
chiffres clés et seuils · cartographie des risques par cycle avec diligences proposées ·
feuille d'ajustements avec incidence sur l'opinion · synthèse prévisionnelle
(avancement, charge restante estimée, trajectoire d'opinion). Export Word.

L'avancement se déduit des commentaires saisis en §5 de Détection des erreurs : les deux
onglets se répondent.

### Lecture des montants *(corrigé — régression sévère)*

`parseNum` ne gérait pas le point comme séparateur de milliers : `385.982.204` était lu
**385,982**. Le format `385.982.204,50`, produit par la plupart des exports Excel en
configuration française, tronquait donc tous les montants.

Règle de levée d'ambiguïté désormais explicite : les deux séparateurs présents → le dernier
est décimal · un seul séparateur répété → milliers · un seul séparateur unique suivi de trois
chiffres → milliers, sauf lecture décimale stricte (taux et pourcentages, second argument
`true`). Négatifs comptables `(1 234)` et `1 234-` reconnus. Espaces normaux, insécables et
fins acceptés.

Les 19 `parseFloat` de l'application ont été remplacés par `parseNum`. Il n'en subsiste
qu'un, à l'intérieur même de `parseNum` — et un test échoue si un autre réapparaît.

Attention en lisant `parsenum.test.js` : le test d'aller-retour sur les montants réels de
MTTCI **ne protège pas** contre cette régression. `fmt()` sépare les milliers par des espaces
fines, que même un parseur naïf élimine. Seuls les cas portant des points la détectent. La
brèche était sur les données *importées*, pas sur l'affichage interne.

### Affichage des montants *(corrigé)*

108 champs de montant étaient des `<input type="number">` affichant la valeur brute, sans
séparateur, avec les flèches du navigateur : `450000` était visuellement coupé. Ils sont
convertis en champs texte formatés, valeur brute au focus, formatée à la sortie. Un
`MutationObserver` traite les lignes ajoutées dynamiquement. 241 champs conservent leur type :
notations, durées en mois, taux — aucun ne contient de valeur ≥ 10 000, c'est testé.

### Firebase et navigation

Un bandeau de diagnostic nomme les scripts SDK manquants quand `gstatic.com` est inaccessible
(pare-feu, antivirus interceptant le HTTPS, extension de blocage), au lieu de laisser remonter
`firebase is not defined`. Les onglets de calcul restent utilisables hors connexion.

La barre de navigation affiche les 34 onglets éclatés sur trois rangées, une par phase, au lieu
de trois menus déroulants.

Le script Kaspersky injecté dans le `<head>` du fichier d'origine a été retiré.

---

## 4. Cartographie du code

`build/manifeste.json` déclare l'ordre de concaténation. **Cet ordre est la sémantique** :
les fichiers partagent une portée globale, et certains dépendent de ce qui précède.

### `src/js/` — bloc 1, noyau d'audit

| Fichier | Contenu |
|---|---|
| `01-noyau.js` | utilitaires, état global, onglets |
| `02-balances-modele.js` | modèle des balances, conclusions par écriture, scan facture |
| `03-balances-table.js` | rendu et import des tables de balance |
| `04-grand-livre.js` | GL Bilan et GL Gestion |
| `05-selection-comptes.js` | sélection automatique des comptes à auditer |
| `06-controle-gl-sondage.js` | contrôle des écritures par sondage |
| `07-bilan-resultat-origine.js` | `renderBilan`, `renderResultat` |
| `08-controles-audit.js` | contrôles de continuité, cohérence des intitulés, détection |
| `09-synthese.js` | génération de la synthèse |

### `src/js/` — blocs 2 et 3

| Fichier | Contenu |
|---|---|
| `10-config-collaboration.js` | `FIREBASE_CONFIG`, `TABS`, connexion, partage de dossier |
| `11-messagerie.js` | messagerie interne, IIFE autonome |

### `src/js/` — bloc 4, liasse et modules ajoutés

| Fichier | Contenu |
|---|---|
| `20-liasse-moteur-origine.js` | armature de la liasse DGI |
| `21-liasse-tft.js` | rendu du TFT |
| `22-liasse-notes.js` | NOTE 1 à NOTE 39, moteur générique |
| `23-liasse-export-xml.js` | export XML EDI pour la télédéclaration |
| `24-parametres.js` | référentiels officiels, onglet PARAMÈTRES |
| `25-moteur-etape2.js` | `PARAM_SPEC`, résolution des comptes, moteur bilan/résultat/TFT |
| `26-cycles.js` | `CYCLES`, sept tests, contrôles de cohérence par cycle |
| `27-cycles-variations.js` | revue des variations, commentaires, export CSV |
| `28-format-montants.js` | `fmtSaisie`, conversion des champs de montant |
| `29-memo-audit.js` | mémo de synthèse, analyse de risque, export Word |
| `30-sdk-guard.js` | diagnostic de chargement du SDK Firebase |
| `31-moteur-unifie.js` | `compute*` en vue de `liasseGet*`, `buildResultatLines` |

### Il n'y a plus de surcharges

Les modules ajoutés redéfinissaient par hoisting neuf fonctions du code d'origine, dont les
versions mortes restaient dans le fichier. Elles ont été retirées au chantier 2 : chaque
fonction n'est plus déclarée qu'une fois, et un test le vérifie.

### Points de branchement dans le code d'origine

| Fonction | Modification |
|---|---|
| `runDetection()` | appelle `runCycles()` et `runCyclesVariations()` |
| `liasseRefreshAll()` | rend l'onglet PARAMÈTRES |
| `collabInitFirebase()` | vérifie le SDK avant d'initialiser |
| `balanceRowHtml()` | produit des champs texte formatés |
| `parseNum()` | réécrite |

---

## 5. La construction

`splice.py` a été supprimé. Il reconstruisait le livrable en cherchant des chaînes de texte
exactes dans le HTML et en les remplaçant — treize étapes, dont deux avaient déjà cassé
silencieusement pendant les travaux.

`build/build.mjs` le remplace, sur un principe inverse : il n'y a plus d'ancre à retrouver,
seulement des marqueurs `/* @@NOM@@ */` dans `src/app.html`, chacun remplacé par la
concaténation des fichiers que `build/manifeste.json` lui associe. La construction échoue si
un marqueur manque, apparaît deux fois, n'est pas résolu, ou si un fichier du manifeste est
absent.

```bash
npm run build        # écrit dist/
npm run verifier     # compare sans écrire — c'est ce que lance le test
```

Quatre tests couvrent la construction elle-même : correspondance dist/sources, manifeste
complet et sans doublon, marqueurs résolus une seule fois, aucune fonction déclarée deux
fois.

---

## 6. Suite de tests

```bash
npm test
```

| Fichier | Portée | Tests |
|---|---|---|
| `liasse.test.js` | bilan, résultat, TFT contre la liasse DGI ; équilibres ; régressions historiques | 10 |
| `moteurs.test.js` | réconciliation des deux moteurs comptables, seuils, contrat des libellés | 8 |
| `build.test.js` | dist/ conforme à src/, manifeste, code mort, estampille de version | 8 |
| `rules.test.js` | règles Firestore sur émulateur : isolation, migration, plafond, messagerie | 15 |
| `parsenum.test.js` | 18 formats de montant, cas ambigu, aller-retour, garde sur `parseFloat` | 9 |
| `cycles.test.js` | rattachement, sept tests par compte, contrôles croisés, risque, variations | 24 |
| `dom.test.js` | jsdom : SDK, navigation, grille de balance, champs de montant, estampille | 8 |

Les trois fichiers que l'archive de reprise ne contenait pas ont été réécrits. Chacun a été
vérifié en sens inverse : une régression injectée dans le code source doit faire virer les
tests au rouge, et leur retrait au vert.

Sans JDK, les 15 tests de règles se sautent au lieu d'échouer : la suite principale reste
exploitable sur un poste sans Java.

Les trois derniers fichiers n'ont jamais été retrouvés : l'archive de reprise ne contenait
que `harness.js` et `liasse.test.js`.

`harness.js` charge les blocs `<script>` de `dist/` dans un bac à sable Node, sans navigateur.
Pour tester un autre fichier :

```bash
SEVEN7_HTML=chemin/vers/app.html npm test
```

Les tests marqués **RÉGRESSION** correspondent à des bugs réels déjà corrigés une fois.
Ne les supprimez pas.

---

## 7. Chantiers, par ordre de priorité

### ~~1. Réconcilier les deux moteurs comptables~~ — *fait, commit `3c13844`*

`compute*` est devenu une vue de `liasseGet*`. Deux écarts mesurés sur MTTCI ont disparu :

- `computeBilanPassif` perdait les comptes 41 créditeurs hors 419 : `41810000`, créditeur de
  113 822 444, n'était capté ni par la ligne 419 ni par la ligne « autres dettes », qui
  excluait tout le 41. L'onglet BILAN et le contrôle d'équilibre de Détection des erreurs
  annonçaient donc un déséquilibre de ce montant sur une balance équilibrée au franc près,
  et le ratio d'autonomie financière sortait à 18,1 % au lieu de 12,8 %.
- `computeResultat` rangeait 707 « produits accessoires » en TC : nul en N, mais
  259 481 536 mal ventilés en N-1.

Deux affirmations de ce README étaient fausses et sont corrigées ici : les seuils de
signification n'étaient **pas** affectés (écart 0 % sur les trois agrégats), et l'ancien
moteur ne classait **pas** un compte 41 créditeur à l'actif — il lisait `SD(41)`, et l'actif
sortait juste. Le défaut était au passif.

### ~~2. Découper le monolithe~~ — *fait, commit `16413a4`*

`src/app.html` plus 23 fichiers dans `src/js/`, reconstruits par `build/build.mjs`. La
première construction reproduisait le livrable **à l'octet près** — c'est ce qui a permis de
valider le découpage avant d'y toucher. Les neuf déclarations mortes ont ensuite été
retirées.

Le découpage s'arrête à des scripts classiques concaténés, pas des modules ES : voir §2 pour
la raison. C'est le seul point où je me suis écarté de la consigne d'origine.

### ~~3. Tester les règles Firestore~~ — *fait*

`firestore.rules` est entré dans le dépôt : il vivait jusque-là hors version, dans un dossier
de déploiement. 14 tests tournent contre l'émulateur Firestore, jamais contre le projet réel.

Le fichier initialement repris était périmé. La version relevée en console couvrait déjà les
deux trous que l'analyse statique avait signalés (`conversations`/`messages`, et la
sous-collection `cabinets` des statistiques), mais n'avait plus le contrôle du plafond
d'abonnement sur `seven7_cabinets`.

```bash
npm run emulateur      # premier terminal (JDK requis)
npm run test:regles    # second
```

Règles déployées le 03/08/2026 : dépôt et production sont alignés.

### Le plafond bloque — décision commerciale du 03/08/2026

La condition de plafond a été rétablie **délibérément** : un cabinet qui atteint sa limite
annuelle ne peut plus créer de dossier et doit changer de palier.

| Palier | Plafond annuel |
|---|---|
| Starter | 5 dossiers |
| Cabinet | 20 dossiers |
| Cabinet Plus | illimité → `plafondDossiers` très grand, voir ci-dessous |

**Deux conditions sur la donnée, sous peine de bloquer un client qui paie :**

1. Tout cabinet doit porter `plafondDossiers`. Un document qui en est dépourvu fait échouer
   l'évaluation de la règle, donc **refuse toute création de dossier**.
2. « Cabinet Plus » est illimité au tarif mais pas dans le code : il se représente par un
   plafond très grand. `SEUIL_ILLIMITE = 9999` dans `src/js/10-config-collaboration.js`
   est le seuil au-delà duquel l'interface affiche « illimité » plutôt qu'un chiffre.

**La grille tarifaire est à corriger.** `seven7-tarifs.html` annonce encore qu'un dossier
au-delà du plafond est « facturé à l'unité ». Ce n'est plus possible : le serveur refuse.

### ~~4. Versionner le livrable~~ — *fait*

L'en-tête et l'écran de connexion affichent `v2.9.0 · <commit> · <date>`. L'écran de
connexion en porte une copie parce qu'il recouvre l'en-tête : un client bloqué avant
authentification doit pouvoir lire sa version.

```bash
npm run estampiller && npm run build && git commit
```

L'estampille est un fichier versionné, pas un produit du build : sinon la date et le hash
changeraient à chaque construction et `npm run verifier` ne pourrait plus rien comparer. Un
livrable construit sur un dépôt modifié porte un suffixe `+modifié` visible dans
l'application.

### 5. Points ouverts sur la liasse

Trois lectures de la planche papier restent à confirmer, signalées dans le bloc P6 de
l'onglet PARAMÈTRES :

- **AJ** — « dont placement en Net (2881 − 2928p) » : le compte 2881 n'existe pas au PCG.
  Sans incidence tant que l'entité n'a pas d'immeuble de placement.
- **FB** — ordre et sens des comptes 4791 / 4793 / 4783 en fin de ligne. Non testable sur
  MTTCI, où FB = 0.
- **FI** — renvoi ¹¹ porté sur 485 dans une ligne qui concerne les incorporelles et
  corporelles. Non testable sur MTTCI, où FI = 0.

Six comptes portant le suffixe « p » (quote-part) sont revendiqués par deux postes :
2818p, 2918p, 2919p, 2939p, 2949p. Le moteur les rattache en totalité au premier poste
déclaré et le signale. Si un client utilise ces comptes, une règle de répartition manuelle
sera nécessaire.

### Comptes hors liasse — invariant à connaître

Un compte que `paramResolve` ne sait pas rattacher **n'entre dans aucun poste du bilan**. Sur
MTTCI, seul `585` « Virements de fonds » est dans ce cas, et c'est légitime : un compte de
virement interne n'a pas de poste de liasse, il doit être soldé à la clôture. Ses 6,4 milliards
de mouvements s'annulent exactement.

L'invariant tenu par les tests n'est donc pas « tout compte est rattaché » mais **« tout compte
non rattaché est soldé »**. Un `585` non soldé — virement en transit au 31/12 — ferait diverger
la trésorerie de la balance de celle de la liasse, sans que rien ne le signale.

### 6. Qualité de donnée observée sur MTTCI

À traiter comme des cas à gérer, pas comme des bugs :

- compte `63280000` présent **deux fois** dans la balance N, avec deux intitulés différents
- numérotation hétérogène : `521120000` et `647800000` à 9 chiffres à côté de `52110000` et
  `64780000` à 8 chiffres
- balance N-1 déséquilibrée en mouvements : MD 26 019 437 107 contre MC 26 041 728 647,
  soit 22 291 540 d'écart. Sans incidence sur les soldes, mais un TFT calculé sur N-1 serait
  faux.
- colonne N-1 du TFT du classeur de référence incohérente : ZH affiche 261 510 046 alors que
  la ligne de contrôle donne 144 028 083. La colonne N, elle, se réconcilie parfaitement —
  c'est sur elle que la validation a été calée.

---

## 8. Avertissement sur l'intégrité du dossier

Pendant les travaux, des fichiers sont apparus dans l'espace de travail sans que je les aie
écrits : un `memo_module.js`, un `firebase_guard_module.js`, deux étapes ajoutées à
`splice.py`, et un livrable `v2_8_MEMO-FIREBASE.html` substitué à celui que j'avais produit.
Ils visaient les mêmes fonctionnalités que celles en cours de développement.

Ils ont tous été écartés et le fichier de `dist/` a été reconstruit à partir des seuls modules
de `src/modules/`. Vérification faite : zéro occurrence des identifiants issus de ces fichiers.

Je n'ai pas d'explication à proposer. C'est une raison de plus de passer sous Git dès le
premier commit : dans un dépôt, chaque ligne a un auteur et une date.
