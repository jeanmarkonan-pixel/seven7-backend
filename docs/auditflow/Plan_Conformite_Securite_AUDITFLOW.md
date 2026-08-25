# 🔒 PLAN DE CONFORMITÉ SÉCURITÉ
## AUDITFLOW — SaaS d'Audit Externe Zone OHADA
### Architecture de sécurité, conformité réglementaire & gouvernance des données

**Date :** Août 2026  
**Version :** 1.0  
**Classification :** CONFIDENTIEL — Interne  
**Responsable :** CTO / DPO (Data Protection Officer)

---

## 📋 TABLE DES MATIÈRES

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Cadre Réglementaire](#2-cadre-réglementaire)
3. [Classification des Données](#3-classification-des-données)
4. [Architecture de Sécurité Technique](#4-architecture-de-sécurité-technique)
5. [Authentification & Contrôle d'Accès](#5-authentification--contrôle-daccès)
6. [Chiffrement & Cryptographie](#6-chiffrement--cryptographie)
7. [Traçabilité & Audit Trail](#7-traçabilité--audit-trail)
8. [Hébergement & Souveraineté des Données](#8-hébergement--souveraineté-des-données)
9. [Gestion des Incidents & Continuité](#9-gestion-des-incidents--continuité)
10. [Tests de Sécurité & Audits](#10-tests-de-sécurité--audits)
11. [Politiques Organisationnelles](#11-politiques-organisationnelles)
12. [Plan d'Action de Mise en Conformité](#12-plan-daction-de-mise-en-conformité)
13. [Annexes](#13-annexes)

---

## 1. RÉSUMÉ EXÉCUTIF

AUDITFLOW traite des données **hautement sensibles** : états financiers, pièces justificatives, rapports d'audit, correspondances avec les régulateurs. La sécurité n'est pas une option — c'est un prérequis métier.

### Enjeux critiques

| Enjeu | Description | Impact en cas de faille |
|-------|-------------|------------------------|
| **Secret professionnel** | Les cabinets d'audit sont tenus au secret professionnel (OEC-CI, ONECCA, ISA 200) | Sanctions disciplinaires, perte de licence, responsabilité pénale |
| **Données financières** | Balances, relevés bancaires, factures — données sensibles au sens du RGPD | Amende jusqu'à 4% du CA mondial |
| **Intégrité du dossier d'audit** | Les pièces probantes doivent être intègres et non altérables | Opinion d'audit invalidée, poursuites judiciaires |
| **Disponibilité** | Les missions d'audit ont des deadlines réglementaires fixes | Pénalités, perte de confiance, résiliation |

### Posture de sécurité

- **Zero Trust** : aucune confiance implicite, vérification à chaque accès
- **Défense en profondeur** : multiples couches de sécurité
- **Privacy by Design** : protection des données dès la conception
- **Traçabilité totale** : chaque action est journalisée et immuable

---

## 2. CADRE RÉGLEMENTAIRE

### 2.1 Règlement Général sur la Protection des Données (RGPD)

**Applicabilité :** Même si AUDITFLOW est basé en Afrique, le RGPD s'applique si :
- Des ressortissants européens sont actionnaires ou dirigeants des entités auditées
- Les cabinets ont des clients ou filiales en Europe
- Les données sont traitées par des sous-traitants européens

**Principes applicables :**

| Principe RGPD | Implémentation AUDITFLOW |
|---------------|-------------------------|
| **Licéité** | Consentement explicite via CGU, contrat de sous-traitance DPA |
| **Finalité limitée** | Données collectées uniquement pour l'audit externe |
| **Minimisation** | Seules les données nécessaires au cycle ISA sont demandées |
| **Exactitude** | Interface de correction par le client et l'auditeur |
| **Limitation conservation** | Archivage 10 ans (conforme OHADA) puis suppression automatique |
| **Intégrité & confidentialité** | Chiffrement AES-256, RBAC, MFA, audit trail |
| **Rendre de comptes** | DPO désigné, registre des traitements, DPIA |

### 2.2 Législation OHADA / UEMOA / CEMAC

| Texte | Exigence | Conformité AUDITFLOW |
|-------|----------|---------------------|
| **Acte uniforme OHADA sur le droit commercial général** | Protection des données commerciales | Chiffrement, RBAC, NDA |
| **Directive UEMOA sur la protection des données** | Principes similaires au RGPD | Privacy by Design, DPO, registre |
| **Loi n°2013-450 CI** (Côte d'Ivoire) | Protection des données à caractère personnel | DPO, consentement, droits des personnes |
| **Code OHADA des marchés publics** | Traçabilité des marchés | Audit trail immuable |
| **COBAC / CRBF** | Confidentialité bancaire | Chiffrement end-to-end, accès restreint |
| **CIMA** (Assurances) | Protection des données assurantielles | Isolation des données par cabinet |

### 2.3 Normes ISA applicables à la sécurité

| Norme ISA | Exigence de sécurité | Implémentation |
|-----------|---------------------|----------------|
| **ISA 200** | Indépendance & objectivité | RBAC, séparation des rôles, logs d'accès |
| **ISA 315** | Protection des éléments probants | Chiffrement, checksum, horodatage |
| **ISA 500** | Intégrité des preuves | SHA-256, versionning, suppression impossible |
| **ISA 700** | Confidentialité du rapport | Chiffrement, workflow de signature, accès restreint |

### 2.4 Obligations professionnelles

| Ordre / Régulateur | Obligation | Sanction en cas de violation |
|-------------------|------------|------------------------------|
| **OEC-CI** | Secret professionnel | Radiation, interdiction d'exercer |
| **ONECCA** | Confidentialité des dossiers | Sanctions disciplinaires |
| **COBAC** | Confidentialité bancaire | Amende jusqu'à 500 M FCFA |
| **Ordre des Avocats** (cas liés) | Secret professionnel | Poursuites pénales |

---

## 3. CLASSIFICATION DES DONNÉES

### 3.1 Niveaux de classification

| Niveau | Couleur | Description | Exemples |
|--------|---------|-------------|----------|
| **CRITIQUE** | 🔴 | Données dont la divulgation causerait un préjudice majeur | Rapports d'audit signés, opinions, circularisations bancaires, PV d'inventaire |
| **CONFIDENTIEL** | 🟠 | Données sensibles au sens réglementaire | Balances comptables, états financiers, factures, contrats |
| **INTERNE** | 🟡 | Données internes au cabinet | Programmes de travail, notes de calcul, correspondances internes |
| **PUBLIC** | 🟢 | Données sans restriction | CGU, documentation publique, landing page |

### 3.2 Matrice de protection par niveau

| Mesure | CRITIQUE | CONFIDENTIEL | INTERNE | PUBLIC |
|--------|----------|--------------|---------|--------|
| Chiffrement au repos | AES-256-GCM | AES-256-GCM | AES-256 | Non requis |
| Chiffrement en transit | TLS 1.3 | TLS 1.3 | TLS 1.2+ | TLS 1.2+ |
| MFA obligatoire | Oui | Oui | Recommandé | Non |
| Accès journalisé | Immuable | Immuable | Oui | Non |
| Backup chiffré | Oui, géo-répliqué | Oui | Oui | Non |
| Durée rétention | 10 ans | 10 ans | 3 ans | 1 an |
| Destruction | Effacement sécurisé (NIST 800-88) | Effacement sécurisé | Suppression logique | Suppression standard |

---

## 4. ARCHITECTURE DE SÉCURITÉ TECHNIQUE

### 4.1 Diagramme de sécurité (Couches)

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE 1 : PERIMÈTRE                         │
│  WAF (Cloudflare / AWS WAF) · DDoS protection · Rate limiting   │
│  Geo-blocking · Bot detection · IP reputation                   │
├─────────────────────────────────────────────────────────────────┤
│                    COUCHE 2 : RÉSEAU                            │
│  VPC isolé · Firewall · Segmentation réseau · VPN site-à-site   │
│  Bastion host · Zero Trust Network Access (ZTNA)                │
├─────────────────────────────────────────────────────────────────┤
│                    COUCHE 3 : APPLICATION                         │
│  Next.js (CSP, HSTS, X-Frame-Options) · NestJS (input validation)│
│  RBAC granulaire · OWASP Top 10 mitigation · API rate limiting  │
├─────────────────────────────────────────────────────────────────┤
│                    COUCHE 4 : DONNÉES                           │
│  PostgreSQL (chiffrement TDE) · Redis (chiffrement)             │
│  MinIO/S3 (chiffrement serveur + client) · Backup chiffré      │
├─────────────────────────────────────────────────────────────────┤
│                    COUCHE 5 : IDENTITÉ                          │
│  MFA (TOTP/WebAuthn) · SSO · RBAC · Session management          │
│  Password policy (NIST 800-63B) · Account lockout               │
├─────────────────────────────────────────────────────────────────┤
│                    COUCHE 6 : SURVEILLANCE                      │
│  SIEM (Wazuh / ELK) · Alerting · Log immutability               │
│  Intrusion Detection (IDS) · File integrity monitoring          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Sécurité réseau

| Composant | Implémentation | Justification |
|-----------|---------------|---------------|
| **WAF** | Cloudflare Pro / AWS WAF | Protection XSS, SQLi, LFI, RCE |
| **DDoS** | Cloudflare Magic Transit / AWS Shield | Protection volumétrique et protocole |
| **Rate limiting** | 100 req/min par IP, 1000 req/min par utilisateur | Prévention brute force et scraping |
| **Geo-blocking** | Blocage des pays non-UEMOA/CEMAC (sauf VPN staff) | Réduction de la surface d'attaque |
| **VPN** | WireGuard pour l'accès admin | Accès sécurisé aux serveurs |
| **VPC** | Segmentation public/private/isolated | Isolation des bases de données |

### 4.3 Sécurité applicative

| Vulnérabilité | Mitigation | Implémentation technique |
|---------------|------------|-------------------------|
| **Injection SQL** | Requêtes paramétrées + ORM | TypeORM / Prisma avec validation |
| **XSS** | CSP + échappement + DOMPurify | `Content-Security-Policy: default-src 'self'` |
| **CSRF** | Token CSRF + SameSite cookies | Double-submit cookie pattern |
| **IDOR** | Vérification d'ownership à chaque requête | Middleware `checkCabinetOwnership()` |
| **Mass Assignment** | Whitelist des champs autorisés | DTO validation NestJS |
| **File Upload** | Validation type + taille + scan AV | Magic bytes check + ClamAV |
| **SSRF** | Whitelist des URLs externes | Validation stricte des callbacks |
| **Deserialization** | Pas de désérialisation non sécurisée | JSON.parse uniquement avec validation |

### 4.4 Headers de sécurité HTTP

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.auditflow.africa; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 0  # Désactivé car remplacé par CSP
```

---

## 5. AUTHENTIFICATION & CONTRÔLE D'ACCÈS

### 5.1 Modèle RBAC (Role-Based Access Control)

| Rôle | Missions | Documents | Tests | Anomalies | Rapports | Admin |
|------|----------|-----------|-------|-----------|----------|-------|
| **Super Admin** | Tout | Tout | Tout | Tout | Tout | Tout |
| **Admin Cabinet** | CRUD cabinet | CRUD | CRUD | CRUD | CRUD | Utilisateurs cabinet |
| **Associé** | Lecture | Lecture | Lecture | CRUD | Signer | — |
| **Manager** | CRUD | CRUD | CRUD | CRUD | Relecture | — |
| **Senior** | CRUD | CRUD | CRUD | CRUD | — | — |
| **Junior** | CRUD (limité) | Lecture | CRUD | Lecture | — | — |
| **Client** | Lecture propre | Upload | — | — | — | — |

### 5.2 Authentification multi-facteurs (MFA)

| Méthode | Priorité | Utilisateurs cibles |
|---------|----------|---------------------|
| **TOTP** (Google Authenticator, Authy) | Obligatoire | Admin, Associés, Managers |
| **WebAuthn** (YubiKey, Touch ID) | Recommandé | Admin, Associés |
| **SMS OTP** | Fallback uniquement | Tous (si TOTP non configuré) |
| **Email OTP** | Désactivé | — (trop faible) |

**Politique MFA :**
- Activation obligatoire pour les rôles Admin, Associé, Manager
- Activation recommandée pour Senior et Junior
- Pas de contournement possible sans validation par un autre admin

### 5.3 Gestion des sessions

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Durée session | 8 heures ( journée de travail ) | Réduction de la fenêtre d'exposition |
| Durée session inactivité | 30 minutes | Verrouillage auto |
| Rotation JWT | Toutes les 15 minutes | Limitation de l'impact d'un token volé |
| Révocation | Instantanée via Redis blacklist | Déconnexion à distance |
| Appareils max | 3 par utilisateur | Limitation du partage de credentials |
| Historique connexions | 90 jours | Détection d'accès anormaux |

### 5.4 Politique de mots de passe

| Règle | Valeur | Standard |
|-------|--------|----------|
| Longueur minimum | 12 caractères | NIST 800-63B |
| Complexité | Au moins 3 types (maj, min, chiffre, spécial) | NIST 800-63B |
| Historique | 12 derniers mots de passe interdits | Bonne pratique |
| Expiration | Jamais (sauf compromission) | NIST 800-63B — les rotations forcées réduisent la sécurité |
| Tentatives échouées | 5 avant lockout 30 min | Prévention brute force |
| Breach check | Vérification Have I Been Pwned API | Alertes si mot de passe compromis |

---

## 6. CHIFFREMENT & CRYPTOGRAPHIE

### 6.1 Chiffrement au repos

| Donnée | Algorithme | Gestion des clés |
|--------|-----------|------------------|
| **Base PostgreSQL** | AES-256-GCM (TDE) | Clés gérées par Hetzner / OVH KMS |
| **Fichiers S3/MinIO** | AES-256-GCM (SSE-S3) + SSE-C (client-side) | Clés maîtres dans HashiCorp Vault |
| **Backups** | AES-256-GCM | Clés séparées des clés de production |
| **Redis** | AES-256-GCM (Redis 6.0+) | Clés dans Vault |
| **Secrets applicatifs** | AES-256-GCM | HashiCorp Vault ou Doppler |
| **Logs** | Non chiffré (accès restreint) | — |

### 6.2 Chiffrement en transit

| Canal | Protocole | Configuration |
|-------|-----------|---------------|
| **Client → Serveur** | TLS 1.3 | ECDHE + AES-256-GCM + P-384 |
| **Serveur → BDD** | TLS 1.3 | Certificats internes PKI |
| **Serveur → Redis** | TLS 1.3 | Auth + ACL Redis |
| **Serveur → S3** | TLS 1.3 | Certificat AWS/Scaleway |
| **API internes** | mTLS (mutual TLS) | Certificats clients requis |

### 6.3 Gestion des clés cryptographiques

| Aspect | Implémentation |
|--------|---------------|
| **Stockage** | HashiCorp Vault (self-hosted) ou AWS KMS / Scaleway KMS |
| **Rotation** | Clés de chiffrement : tous les 90 jours. Clés de signature : tous les 180 jours |
| **Séparation** | Clés de production, staging, développement strictement isolées |
| **Accès** | Accès Vault via approbation à deux yeux (dual control) |
| **Backup clés** | HSM offline dans coffre physique (pour clés maîtres) |
| **Destruction** | Effacement sécurisé conforme NIST 800-88 Rev. 1 |

---

## 7. TRAÇABILITÉ & AUDIT TRAIL

### 7.1 Journalisation obligatoire

| Événement | Niveau | Retention | Immuable |
|-----------|--------|-----------|----------|
| **Connexion / Déconnexion** | INFO | 10 ans | Oui |
| **Échec de connexion** | WARNING | 10 ans | Oui |
| **Création / Modification / Suppression** | INFO | 10 ans | Oui |
| **Export de données** | WARNING | 10 ans | Oui |
| **Accès à un document** | INFO | 10 ans | Oui |
| **Modification d'anomalie** | INFO | 10 ans | Oui |
| **Signature de rapport** | INFO | 10 ans | Oui |
| **Changement de rôle** | WARNING | 10 ans | Oui |
| **Accès admin** | WARNING | 10 ans | Oui |
| **Échec d'autorisation** | ERROR | 10 ans | Oui |

### 7.2 Format des logs

```json
{
  "timestamp": "2026-08-19T14:32:01Z",
  "severity": "INFO",
  "event_type": "DOCUMENT_ACCESS",
  "actor": {
    "user_id": "uuid",
    "email": "user@cabinet.ci",
    "role": "SENIOR",
    "cabinet_id": "uuid"
  },
  "resource": {
    "type": "DOCUMENT",
    "id": "uuid",
    "mission_id": "uuid"
  },
  "action": "READ",
  "context": {
    "ip": "102.68.x.x",
    "user_agent": "Mozilla/5.0...",
    "session_id": "sess_uuid",
    "geo": {"country": "CI", "city": "Abidjan"}
  },
  "integrity": "sha256:abc123...",
  "previous_hash": "sha256:def456..."
}
```

### 7.3 Immutabilité des logs

| Mécanisme | Implémentation |
|-----------|---------------|
| **Hash chaîné** | Chaque log contient le hash du log précédent (blockchain-like) |
| **Stockage WORM** | Write-Once-Read-Many sur S3 Glacier |
| **Accès** | Lecture seule pour tout le monde, écriture via service dédié |
| **Export** | Export chiffré vers coffre-fort numérique externe mensuellement |
| **Alertes** | Alertes en temps réel si tentative de modification détectée |

---

## 8. HÉBERGEMENT & SOUVERAINETÉ DES DONNÉES

### 8.1 Stratégie d'hébergement

| Environnement | Fournisseur | Localisation | Justification |
|--------------|-------------|--------------|---------------|
| **Production** | Hetzner Cloud | Falkenstein, Allemagne | DSGVO-compliant, excellent rapport prix/perf, latence acceptable (~120ms depuis Abidjan) |
| **Backup primaire** | Scaleway | Paris, France | RGPD, tarifs compétitifs, zone UEMOA-friendly |
| **Backup secondaire** | MinIO auto-hébergé | Côte d'Ivoire (optionnel année 3) | Souveraineté des données critiques |
| **Disaster Recovery** | OVHcloud | Gravelines, France | DRP géographique |
| **CDN** | Cloudflare | Global (PoP Lagos, Johannesburg) | Performance, sécurité DDoS |

### 8.2 Politique de résidence des données

| Principe | Implémentation |
|----------|---------------|
| **Données clients** | Stockées exclusivement en Europe (UE/EEA) |
| **Logs de sécurité** | Répliqués en Europe, copie locale chiffrée en CI (année 3) |
| **Backups** | Primaire Europe, secondaire Europe (région différente) |
| **Pas de transfert** | Aucune donnée client ne transite par des serveurs hors EEA |
| **Sous-traitants** | DPA (Data Processing Agreement) signé avec chaque fournisseur |

### 8.3 Plan de souveraineté progressive

| Phase | Date | Action |
|-------|------|--------|
| 1 | Année 1–2 | Hébergement Europe uniquement, conformité RGPD maximale |
| 2 | Année 3 | Datacenter local CI pour backups chiffrés (cold storage) |
| 3 | Année 4–5 | Option multi-cloud : production Europe + edge Afrique (AWS Afrique du Sud / Azure Afrique du Sud) |

---

## 9. GESTION DES INCIDENTS & CONTINUITÉ

### 9.1 Classification des incidents

| Niveau | Critère | Délai de réponse | Délai de résolution |
|--------|---------|-----------------|---------------------|
| **P0 — Critique** | Perte de données, breach confirmé, indisponibilité totale | 15 min | 4 heures |
| **P1 — Majeur** | Fonctionnalité critique down, suspicion de breach | 1 heure | 8 heures |
| **P2 — Modéré** | Fonctionnalité non-critique affectée, performance dégradée | 4 heures | 24 heures |
| **P3 — Mineur** | Bug cosmétique, question sécurité non-urgente | 24 heures | 72 heures |

### 9.2 Procédure de réponse à incident

```
1. DÉTECTION
   └─ Alertes SIEM / Signalement utilisateur / Scan externe

2. CONTAINEMENT
   └─ Isolation des systèmes affectés
   └─ Révocation des sessions suspectes
   └─ Blocage des IPs malveillantes

3. INVESTIGATION
   └─ Analyse forensique des logs
   └─ Évaluation de l'impact (données touchées ?)
   └─ Identification de la root cause

4. ÉRADICATION
   └─ Correction de la vulnérabilité
   └─ Patch / Configuration / Code fix

5. RÉCUPÉRATION
   └─ Restauration depuis backup (si nécessaire)
   └─ Tests de non-régression
   └─ Réactivation progressive

6. POST-MORTEM
   └─ Rapport d'incident sous 72h
   └─ Actions correctives
   └─ Mise à jour des procédures
```

### 9.3 Plan de continuité (BCP)

| Scénario | RTO | RPO | Procédure |
|----------|-----|-----|-----------|
| **Panne serveur applicatif** | 1 heure | 0 | Basculer vers instance de secours (auto-scaling) |
| **Panne base de données** | 2 heures | 5 min | Failover vers réplica PostgreSQL (streaming replication) |
| **Panne datacenter** | 4 heures | 15 min | Activation du site de secours (backup restauré) |
| **Ransomware** | 8 heures | 1 heure | Restauration depuis backup WORM non-chiffré par l'attaque |
| **Breach données** | — | — | Procédure P0, notification CNIL + autorités locales sous 72h |

### 9.4 Backup & Recovery

| Type | Fréquence | Rétention | Localisation | Chiffrement |
|------|-----------|-----------|--------------|-------------|
| **BDD — Snapshot** | Toutes les 4 heures | 7 jours | Local + Scaleway | AES-256 |
| **BDD — Backup complet** | Quotidien (2h00 UTC) | 30 jours | Scaleway Paris | AES-256 |
| **BDD — Backup mensuel** | Mensuel | 10 ans | S3 Glacier (WORM) | AES-256 |
| **Fichiers — Backup** | Temps réel (sync MinIO) | 10 ans | Scaleway + Glacier | AES-256 |
| **Configuration** | À chaque déploiement | 90 versions | Git + Vault | AES-256 |
| **Logs** | Continu | 10 ans | S3 Glacier (WORM) | Non |

### 9.5 Tests de reprise

| Type | Fréquence | Portée |
|------|-----------|--------|
| **Tabletop exercise** | Trimestriel | Scénario de breach, simulation réponse |
| **Restore test BDD** | Mensuel | Restauration complète sur environnement isolé |
| **Failover test** | Semestriel | Basculement vers site de secours |
| **Penetration test** | Semestriel | Test externe par cabinet spécialisé |

---

## 10. TESTS DE SÉCURITÉ & AUDITS

### 10.1 Programme de tests

| Type | Fréquence | Responsable | Portée |
|------|-----------|-------------|--------|
| **SAST** (Static Analysis) | À chaque commit | SonarQube / CodeQL | Code source complet |
| **DAST** (Dynamic Analysis) | Hebdomadaire | OWASP ZAP | Application web |
| **SCA** (Dependency Scan) | À chaque commit | Snyk / Dependabot | Dépendances NPM |
| **Container Scan** | À chaque build | Trivy / Clair | Images Docker |
| **Secrets Scan** | À chaque commit | GitLeaks / TruffleHog | Clés API, mots de passe |
| **Penetration Test** | Semestriel | Cabinet externe (MVP -> année 2) | Black box + grey box |
| **Vulnerability Assessment** | Mensuel | Interne + outil automatisé | Infrastructure complète |
| **Red Team Exercise** | Annuel (année 3+) | Cabinet spécialisé | Simulation attaque réelle |

### 10.2 Bug Bounty

| Paramètre | Valeur |
|-----------|--------|
| **Plateforme** | HackerOne ou YesWeHack (année 2) |
| **Scope** | Application web, API, infrastructure |
| **Récompenses** | Low : 50 000 FCFA | Medium : 150 000 FCFA | High : 500 000 FCFA | Critical : 1 500 000 FCFA |
| **Règles** | Pas de DoS, pas d'accès données clients réelles, divulgation responsable |

### 10.3 Certifications visées

| Certification | Timeline | Justification |
|--------------|----------|---------------|
| **ISO 27001** | Année 2 | Standard international de sécurité de l'information |
| **ISO 27017** | Année 3 | Sécurité cloud |
| **SOC 2 Type II** | Année 3 | Confiance des clients internationaux |
| **Label SecNumCloud** (ANSSI) | Année 4 | Confiance des administrations françaises en Afrique |

---

## 11. POLITIQUES ORGANISATIONNELLES

### 11.1 Charte de sécurité pour les employés

| Règle | Description | Sanction |
|-------|-------------|----------|
| **Appareils personnels** | Interdiction d'accéder aux données production depuis un appareil personnel | Avertissement → Rupture |
| **Stockage local** | Interdiction de télécharger des données clients sur disque local | Rupture immédiate |
| **Partage de credentials** | Interdiction stricte | Rupture immédiate |
| **Email** | Pas de données clients dans les emails personnels | Avertissement |
| **Réseaux publics** | VPN obligatoire hors du bureau | Avertissement |
| **USB / Cloud externe** | Interdiction | Rupture |
| **Télétravail** | Poste fourni par l'entreprise, connexion VPN, MFA obligatoire | — |

### 11.2 Onboarding / Offboarding sécurisé

| Phase | Actions |
|-------|---------|
| **Onboarding** | Signature NDA, formation sécurité, configuration MFA, attribution matériel, création compte avec privilèges minimum |
| **Changement de rôle** | Révocation des anciens accès, attribution des nouveaux, revue des sessions actives |
| **Offboarding** | Révocation immédiate de tous les accès, récupération du matériel, sauvegarde puis suppression des données locales, compte rendu au manager |

### 11.3 Politique de développement sécurisé (SDLC)

| Phase | Activité sécurité |
|-------|-------------------|
| **Conception** | Threat Modeling (STRIDE), revue d'architecture sécurité |
| **Développement** | SAST, secrets scan, pair programming sécurité |
| **Test** | DAST, tests de pénétration internes, revue de code sécurité |
| **Déploiement** | Container scan, validation des configurations, check-list sécurité |
| **Production** | Monitoring SIEM, alerting, tests de vulnérabilité continus |

---

## 12. PLAN D'ACTION DE MISE EN CONFORMITÉ

### 12.1 Phase 1 — Fondations (Mois 1–3)

| # | Action | Responsable | Livrable | Priorité |
|---|--------|-------------|----------|----------|
| 1 | Mise en place TLS 1.3 partout | DevOps | Config Nginx/Traefik | P0 |
| 2 | Configuration CSP + headers sécurité | Frontend | Headers HTTP | P0 |
| 3 | Mise en place RBAC complet | Backend | Middleware + tables | P0 |
| 4 | MFA TOTP pour rôles sensibles | Backend | Intégration OTP | P0 |
| 5 | Chiffrement BDD (TDE) | DevOps | Config PostgreSQL | P0 |
| 6 | Chiffrement stockage S3/MinIO | DevOps | SSE-S3 + SSE-C | P0 |
| 7 | Audit trail : tables + triggers | Backend | Schéma SQL complet | P0 |
| 8 | Rate limiting API | Backend | Middleware NestJS | P0 |
| 9 | WAF + DDoS protection | DevOps | Cloudflare / AWS WAF | P0 |
| 10 | Politique mots de passe NIST | Backend | Validation + HIBP | P1 |
| 11 | Vault HashiCorp (ou Doppler) | DevOps | Gestion secrets | P1 |
| 12 | Documentation sécurité interne | CTO | Wiki sécurité | P1 |

### 12.2 Phase 2 — Renforcement (Mois 4–6)

| # | Action | Responsable | Livrable | Priorité |
|---|--------|-------------|----------|----------|
| 13 | SIEM (Wazuh ou ELK) | DevOps | Dashboard + alertes | P1 |
| 14 | File Integrity Monitoring | DevOps | AIDE / OSSEC | P1 |
| 15 | Backup automatisé + test restore | DevOps | Procédure + cron | P1 |
| 16 | SAST/DAST automatisé (SonarQube + ZAP) | DevOps | CI/CD pipeline | P1 |
| 17 | Container scanning (Trivy) | DevOps | CI/CD pipeline | P1 |
| 18 | Secrets scanning (GitLeaks) | DevOps | Pre-commit hook | P1 |
| 19 | DPA avec tous les fournisseurs | CEO / Juridique | Contrats signés | P1 |
| 20 | Registre des traitements RGPD | DPO | Document conformité | P1 |
| 21 | DPIA (Data Protection Impact Assessment) | DPO | Rapport DPIA | P1 |
| 22 | Charte de sécurité employés | CTO | Document signé | P2 |
| 23 | Procédure incident + BCP | CTO | Document + test | P2 |
| 24 | Penetration test MVP | Externe | Rapport + corrections | P2 |

### 12.3 Phase 3 — Maturité (Mois 7–12)

| # | Action | Responsable | Livrable | Priorité |
|---|--------|-------------|----------|----------|
| 25 | Bug Bounty program | CTO | Plateforme + règles | P2 |
| 26 | Red Team exercise (simulation) | Externe | Rapport + actions | P2 |
| 27 | Certification ISO 27001 (préparation) | CTO / Externe | Gap analysis | P2 |
| 28 | SOC 2 Type I (préparation) | CTO / Externe | Gap analysis | P3 |
| 29 | Multi-cloud / edge Afrique | DevOps | Architecture | P3 |
| 30 | HSM pour clés maîtres | DevOps | Infrastructure | P3 |

---

## 13. ANNEXES

### Annexe A — Glossaire sécurité

| Terme | Définition |
|-------|------------|
| **AES-256-GCM** | Advanced Encryption Standard — 256 bits, mode Galois/Counter Mode (chiffrement authentifié) |
| **CSP** | Content Security Policy — en-tête HTTP contrôlant les ressources chargées |
| **DPA** | Data Processing Agreement — contrat de sous-traitance de données |
| **DPIA** | Data Protection Impact Assessment — analyse d'impact sur la protection des données |
| **HSM** | Hardware Security Module — module matériel de sécurité pour les clés cryptographiques |
| **IDS/IPS** | Intrusion Detection/Prevention System |
| **mTLS** | Mutual TLS — authentification mutuelle par certificats |
| **RBAC** | Role-Based Access Control — contrôle d'accès basé sur les rôles |
| **RTO** | Recovery Time Objective — temps max de reprise après incident |
| **RPO** | Recovery Point Objective — perte de données max acceptable |
| **SAST/DAST** | Static/Dynamic Application Security Testing |
| **SIEM** | Security Information and Event Management |
| **TDE** | Transparent Data Encryption — chiffrement transparent de la base de données |
| **TLS 1.3** | Transport Layer Security version 1.3 |
| **WAF** | Web Application Firewall |
| **WORM** | Write Once Read Many — stockage immuable |
| **ZTNA** | Zero Trust Network Access |

### Annexe B — Check-list de sécurité pré-déploiement

- [ ] TLS 1.3 configuré sur tous les endpoints
- [ ] Headers de sécurité HTTP présents et valides
- [ ] CSP configuré et testé (pas de `unsafe-inline` sauf nécessaire)
- [ ] RBAC implémenté et testé pour chaque endpoint
- [ ] MFA activé pour les rôles Admin, Associé, Manager
- [ ] Rate limiting actif (100 req/min IP, 1000 req/min user)
- [ ] BDD chiffrée (TDE)
- [ ] Stockage fichiers chiffré (SSE-S3 ou SSE-C)
- [ ] Audit trail opérationnel et testé
- [ ] Secrets externalisés (Vault/Doppler, pas dans le code)
- [ ] Pas de credentials hardcodés
- [ ] Pas de données de test en production
- [ ] Logs d'erreur ne divulguent pas de données sensibles
- [ ] Backup configuré et testé (restore réussi)
- [ ] WAF actif et configuré
- [ ] DPA signé avec tous les sous-traitants
- [ ] Registre des traitements à jour
- [ ] Incident response plan documenté
- [ ] Contact DPO accessible
- [ ] Dernière revue de code sécurité effectuée

### Annexe C — Contacts sécurité

| Rôle | Nom | Email | Téléphone | Disponibilité |
|------|-----|-------|-----------|---------------|
| **DPO (Data Protection Officer)** | [À nommer] | dpo@auditflow.africa | +225 XX XX XX XX | 24/7 (P0/P1) |
| **CTO / Responsable sécurité** | [À nommer] | cto@auditflow.africa | +225 XX XX XX XX | 24/7 (P0/P1) |
| **CEO** | Fondateur | ceo@auditflow.africa | +225 XX XX XX XX | P0 uniquement |
| **Fournisseur hébergement** | Hetzner Support | support@hetzner.com | — | P0/P1 |
| **Fournisseur WAF** | Cloudflare | — | — | P0/P1 |
| **Cabinet audit sécurité** | [À désigner] | — | — | Sur demande |

### Annexe D — Modèle de notification de violation de données

```
OBJET : Notification de violation de données personnelles — [Référence incident]

À : CNIL / Autorité de protection des données
De : DPO AUDITFLOW <dpo@auditflow.africa>
Date : [Date de détection]

1. NATURE DE LA VIOLATION
   [Description technique et fonctionnelle]

2. CATÉGORIES DE DONNÉES CONCERNÉES
   [Données d'identification, données financières, etc.]

3. NOMBRE DE PERSONNES CONCERNÉES
   [Nombre approximatif]

4. CONSÉQUENCES PROBABLES
   [Risque pour les droits et libertés]

5. MESURES PRISES OU ENVISAGÉES
   [Containement, correction, prévention]

6. CONTACT POUR INFORMATION COMPLÉMENTAIRE
   DPO : dpo@auditflow.africa
```

---

*Document rédigé dans le cadre de la mise en conformité sécurité du projet AUDITFLOW.*
*Prochaine révision : après le penetration test MVP (Mois 6).*

**© 2026 — CONFIDENTIEL — Tous droits réservés.**
