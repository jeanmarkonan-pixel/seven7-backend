# SEVEN7 AUDIT — dossier de reprise

Outil d'audit externe sous référentiel **SYSCOHADA révisé / OHADA**, application web autonome
distribuée sous forme d'un fichier HTML unique, hébergée sur Firebase.

Ce dossier contient l'état du code au terme d'une série de travaux menés en conversation,
les modules ajoutés, le script de construction et une **suite de tests de non-régression**
calée sur une liasse fiscale réelle. Il est destiné à être repris dans Claude Code.

---

## 1. Démarrage

```bash
npm install          # jsdom, pour les tests d'interface
npm test             # 27 tests — doivent tous passer avant toute livraison
npm run build        # régénère dist/ à partir de src/modules/ (voir §5)
```

**Premier réflexe avant toute modification :**

```bash
git init && git add -A && git commit -m "État de reprise — v2.9"
```

Il n'existe aujourd'hui aucun historique : les versions successives sont des fichiers HTML
distincts de 1,3 Mo, impossibles à comparer. C'est la première chose à corriger.

---

## 2. Ce qu'il faut savoir avant de toucher au code

### L'application est un fichier HTML unique

`dist/seven7-app_v2_9_NAV-ECLATEE.html` — 1,32 Mo, **quatre blocs `<script>` inline**,
tout en variables globales. Il n'y a ni build, ni modules, ni bundler. Le fichier est
déployé tel quel sur Firebase Hosting.

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
qu'un, à l'intérieur même de `parseNum`.

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

### Modules ajoutés — `src/modules/`

| Fichier | Contenu | Dépend de |
|---|---|---|
| `param_module.js` | référentiels officiels, rendu de l'onglet PARAMÈTRES | — |
| `engine_module.js` | `PARAM_SPEC`, résolution des comptes, moteur bilan/résultat/TFT | param |
| `cycles_module.js` | `CYCLES`, sept tests, contrôles de cohérence par cycle | engine |
| `cyclesvar_module.js` | revue des variations, commentaires, export CSV | cycles, engine |
| `format_module.js` | `fmtSaisie`, conversion des champs de montant | `parseNum` |
| `memo_audit_module.js` | mémo de synthèse, analyse de risque, export Word | cycles, engine |
| `sdk_guard_module.js` | diagnostic de chargement du SDK Firebase | — |

Ils sont concaténés et injectés dans le **dernier bloc `<script>`**, juste avant
`function liasseShowTab`. Les déclarations de fonctions étant hoistées, les modules
**redéfinissent** les fonctions homonymes du code d'origine — c'est le mécanisme de
surcharge utilisé pour le moteur de la liasse.

### Fonctions du code d'origine surchargées

`liasseFindRef` · `liasseSumByRef` · `liasseSumMovementByRef` · `liasseGetTFTColumn` ·
`liasseRenderTFT`

Les versions d'origine restent dans le fichier, en amont. Elles ne sont plus appelées.

### Points de branchement dans le code d'origine

| Fonction | Modification |
|---|---|
| `runDetection()` | appelle `runCycles()` et `runCyclesVariations()` |
| `liasseRefreshAll()` | rend l'onglet PARAMÈTRES |
| `collabInitFirebase()` | vérifie le SDK avant d'initialiser |
| `balanceRowHtml()` | produit des champs texte formatés |
| `parseNum()` | réécrite |

---

## 5. Le script de construction — à remplacer en priorité

`build/splice.py` reconstruit le fichier livrable en **cherchant des chaînes de texte exactes**
dans le HTML d'origine et en les remplaçant. Treize étapes, chacune protégée par une assertion
`must()` qui échoue si l'ancre n'est pas trouvée exactement une fois.

**C'est fragile et il faut s'en débarrasser.** Une ancre qui bouge d'un espace fait échouer la
construction ; pire, une ancre qui devient ambiguë fait échouer silencieusement. Deux étapes
ont déjà cassé de cette manière pendant les travaux.

Ce script existait parce que je ne pouvais pas éditer le fichier en place. Dans Claude Code,
cette contrainte disparaît. La marche à suivre :

1. Appliquer une dernière fois `splice.py` pour obtenir `dist/`
2. Committer ce fichier comme nouvelle base
3. Supprimer `splice.py` et éditer directement
4. Puis, quand la suite de tests est verte et stable, découper le monolithe

---

## 6. Suite de tests

```bash
npm test
```

| Fichier | Portée | Tests |
|---|---|---|
| `liasse.test.js` | bilan, résultat, TFT contre la liasse DGI ; équilibres ; régressions historiques | 10 |
| `parsenum.test.js` | 18 formats de montant, cas ambigu, aller-retour affichage/lecture | 4 |
| `cycles.test.js` | rattachement, couverture, contrôles croisés, risque, mémo | 8 |
| `dom.test.js` | jsdom : SDK, navigation, grille de balance, champs de montant | 5 |

`harness.js` charge les blocs `<script>` de `dist/` dans un bac à sable Node, sans navigateur.
Pour tester un autre fichier :

```bash
SEVEN7_HTML=chemin/vers/app.html npm test
```

Les tests marqués **RÉGRESSION** correspondent à des bugs réels déjà corrigés une fois.
Ne les supprimez pas.

---

## 7. Chantiers, par ordre de priorité

### 1. Réconcilier les deux moteurs comptables — *critique*

L'application contient **deux moteurs en parallèle** :

- `computeBilanActif` / `computeBilanPassif` / `computeResultat` — l'historique, qui alimente
  la Planification (calcul des seuils), la Revue analytique (ratios), les onglets BILAN et
  RESULTAT, et `genererSynthese()`
- `liasseGetActif` / `liasseGetPassif` / `liasseGetResultat` — le nouveau, branché sur les
  mappings officiels, qui alimente la liasse, les cycles et le mémo

**Les corrections de mapping ne sont que dans le second.** Les seuils de signification et les
ratios de la revue analytique sont donc encore calculés sur l'ancienne logique, qui classe un
compte 41 créditeur à l'actif.

Marche à suivre : écrire un test qui compare les sorties des deux moteurs sur MTTCI, mesurer
l'écart, puis faire pointer l'ancien vers le nouveau plutôt que de maintenir les deux.

### 2. Découper le monolithe

1,32 Mo, quatre blocs de script, tout en global. Un découpage en modules ES avec un build
(esbuild convient) qui regénère le fichier unique : vous gardez un livrable autonome, le code
devient maintenable et les modules `src/modules/` cessent d'être des surcharges pour devenir
le code de référence.

### 3. Tester les règles Firestore

Les règles de sécurité et les comptes Auth par dossier n'ont aucune couverture. L'émulateur
Firebase permet de vérifier qu'un cabinet ne peut pas lire le dossier d'un autre — infaisable
sans environnement local.

### 4. Versionner le livrable

Afficher un numéro de version dans l'application et le rattacher au commit. Vos cabinets
clients doivent pouvoir dire quelle version ils utilisent.

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
