# Passer SEVEN7 sur un nom de domaine propre

Firebase Hosting sert aujourd'hui l'application sur `https://seven7-audit.web.app`.
Ce document décrit le passage à votre propre domaine — par exemple `audit.moncabinet.ci`.

---

## Ce qui NE change pas dans le code

**Aucune modification de l'application n'est nécessaire.** Trois valeurs pourraient le laisser
croire ; aucune ne doit être touchée.

| Valeur | Rôle | À modifier ? |
|---|---|---|
| `authDomain: "seven7-audit.firebaseapp.com"` | domaine technique du service d'authentification | **non** — il est indépendant du domaine d'hébergement |
| `projectId: "seven7-audit"` | identifiant du projet Firebase | **non** — le projet ne change pas |
| `@seven7-audit.local` | suffixe des identifiants de connexion internes | **JAMAIS** — voir l'avertissement ci-dessous |

### ⚠ Ne touchez jamais au suffixe `@seven7-audit.local`

Chaque dossier et chaque cabinet possède un compte d'authentification dont l'identifiant est
construit ainsi :

```
dossier-<identifiant>@seven7-audit.local
cabinet-<code>@seven7-audit.local
```

Ce n'est **pas** une adresse électronique réelle : c'est un identifiant interne, jamais envoyé
à personne. Il ne devient pas obsolète parce que le site change d'adresse.

Le modifier créerait de nouveaux comptes vides et **rendrait inaccessibles tous les dossiers
existants** — les anciens comptes resteraient en base, sans plus aucun moyen de les atteindre
depuis l'application. La règle Firestore `seven7_dossiers_public` compare d'ailleurs
littéralement cette chaîne : la changer d'un côté sans l'autre casserait aussi le tableau de
bord cabinet.

---

## Procédure

### 1. Déclarer le domaine dans Firebase

Console Firebase → projet `seven7-audit` → **Hosting** → *Ajouter un domaine personnalisé*.

Saisissez le domaine voulu. Firebase demande d'abord d'en **prouver la propriété** : il fournit
un enregistrement `TXT` à créer chez votre bureau d'enregistrement.

### 2. Créer les enregistrements DNS chez votre registrar

Firebase affiche les valeurs exactes. Elles prennent l'une de ces deux formes :

**Domaine racine** (`moncabinet.ci`) — deux enregistrements `A` :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | *première adresse fournie par Firebase* |
| A | `@` | *seconde adresse fournie par Firebase* |

**Sous-domaine** (`audit.moncabinet.ci`) — un seul enregistrement :

| Type | Nom | Valeur |
|---|---|---|
| A | `audit` | *adresse fournie par Firebase* |

> Recopiez les valeurs que la console affiche à ce moment-là. Ne reprenez pas d'adresses
> trouvées ailleurs : Firebase peut en changer, et un enregistrement périmé donne un site
> injoignable sans message d'erreur explicite.

### 3. Attendre la propagation et le certificat

Firebase vérifie le `TXT`, puis provisionne un certificat TLS. Comptez de quelques minutes à
24 heures selon votre registrar. L'état est visible dans la console, sur la ligne du domaine.

Tant que le certificat n'est pas émis, le domaine répond en erreur de sécurité : c'est normal,
il n'y a rien à corriger.

### 4. Autoriser le domaine côté authentification

Console Firebase → **Authentication** → *Settings* → **Domaines autorisés** → ajouter le
nouveau domaine.

L'application n'utilise aujourd'hui que l'authentification par identifiant et mot de passe,
qui fonctionne depuis n'importe quelle origine : cette étape n'est donc **pas bloquante
aujourd'hui**. Faites-la quand même — elle le deviendrait le jour où une connexion Google,
un lien de connexion par courriel ou une réinitialisation de mot de passe seraient ajoutés,
et le diagnostic serait alors difficile à faire.

### 5. Vérifier

```bash
curl -sI https://VOTRE-DOMAINE/ | grep -iE "^(HTTP|cache-control)"
```

Attendu : `HTTP/2 200` et `Cache-Control: no-cache, no-store, must-revalidate`.

Vérifiez ensuite dans un navigateur que l'estampille de version en bas de l'en-tête affiche
bien la version courante, et que l'installation sur mobile est proposée.

---

## Après le basculement

**Les deux adresses fonctionnent en parallèle.** `seven7-audit.web.app` continue de servir
l'application ; le domaine personnalisé s'y ajoute, il ne le remplace pas.

Deux conséquences :

- Vos cabinets qui ont installé l'application depuis l'ancienne adresse **continueront de
  l'utiliser** : une application installée est liée à son origine. Prévenez-les de
  désinstaller puis de réinstaller depuis la nouvelle adresse, sinon deux installations
  coexisteront.
- Les données ne sont pas affectées : elles vivent dans Firestore, rattachées au projet, pas
  au domaine. Un dossier ouvert depuis l'ancienne adresse est le même que depuis la nouvelle.

Si vous souhaitez fermer l'ancienne adresse, `firebase hosting:disable` la met hors service —
mais cela couperait aussi les installations existantes. À ne faire qu'après avoir vérifié que
tous les cabinets ont migré.

---

## Ce que je ne peux pas faire à votre place

L'ajout d'un domaine personnalisé n'existe pas dans l'interface en ligne de commande de
Firebase : il passe obligatoirement par la console. La création des enregistrements DNS,
elle, se fait chez votre bureau d'enregistrement, auquel je n'ai pas accès.
