-- ═══════════════════════════════════════════════════════════════════════════════
-- SCHÉMA SQL COMPLET — AUDITFLOW
-- SaaS d'Audit Externe — Zone OHADA (ISA + SYSCOHADA)
-- PostgreSQL 15+ | Encoding: UTF-8
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS & CONFIGURATION
-- ───────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schéma dédié
CREATE SCHEMA IF NOT EXISTS auditflow;
SET search_path TO auditflow, public;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. TABLES DE RÉFÉRENCE (ENUMS & LOOKUPS)
-- ───────────────────────────────────────────────────────────────────────────────

-- Types de missions
CREATE TABLE ref_type_mission (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts de mission
CREATE TABLE ref_statut_mission (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    couleur     VARCHAR(7) DEFAULT '#6B7280',
    ordre       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Cycles ISA
CREATE TABLE ref_cycle_isa (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    description TEXT,
    classe_syscohada VARCHAR(50), -- ex: "Classe 5", "Classe 2"
    ordre       INTEGER NOT NULL DEFAULT 0,
    actif       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Assertions d'audit (ISA 315/330)
CREATE TABLE ref_assertion (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10) UNIQUE NOT NULL, -- E/O, C, V, R/O, P
    libelle_fr  VARCHAR(100) NOT NULL,
    libelle_en  VARCHAR(100),
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Types de tests
CREATE TABLE ref_type_test (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts de test
CREATE TABLE ref_statut_test (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    couleur     VARCHAR(7) DEFAULT '#6B7280',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts d'anomalie
CREATE TABLE ref_statut_anomalie (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    couleur     VARCHAR(7) DEFAULT '#6B7280',
    ordre       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Types de documents
CREATE TABLE ref_type_document (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    extensions  VARCHAR(100), -- ex: "pdf,xlsx,docx"
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts de document
CREATE TABLE ref_statut_document (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    couleur     VARCHAR(7) DEFAULT '#6B7280',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Types de rapports
CREATE TABLE ref_type_rapport (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    template_path VARCHAR(255),
    isa_reference VARCHAR(50), -- ex: "ISA 700", "ISA 705"
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Types d'opinion
CREATE TABLE ref_type_opinion (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(200) NOT NULL,
    description TEXT,
    isa_reference VARCHAR(50),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Rôles utilisateurs
CREATE TABLE ref_role_utilisateur (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    niveau      INTEGER NOT NULL DEFAULT 0, -- hiérarchie
    permissions JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Types d'activité (audit trail)
CREATE TABLE ref_type_activite (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,
    libelle     VARCHAR(100) NOT NULL,
    categorie   VARCHAR(50) NOT NULL, -- AUTH, MISSION, DOCUMENT, TEST, ANOMALIE, RAPPORT
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. TABLES MÉTIER — CABINETS & UTILISATEURS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE cabinet (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                 VARCHAR(200) NOT NULL,
    raison_sociale      VARCHAR(200),
    siret               VARCHAR(50),
    rccm                VARCHAR(50), -- Registre du Commerce
    numero_oec          VARCHAR(50), -- Numéro d'inscription OEC
    adresse             TEXT,
    ville               VARCHAR(100),
    pays                VARCHAR(100) DEFAULT 'Côte d'Ivoire',
    telephone           VARCHAR(30),
    email               VARCHAR(100),
    site_web            VARCHAR(255),
    logo_url            VARCHAR(500),
    couleur_primaire    VARCHAR(7) DEFAULT '#1E40AF',
    parametrage         JSONB DEFAULT '{}', -- cycles activés, templates personnalisés
    date_activation     DATE,
    date_expiration     DATE,
    statut              VARCHAR(20) DEFAULT 'actif', -- actif, suspendu, resilie
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cabinet_statut ON cabinet(statut);
CREATE INDEX idx_cabinet_pays ON cabinet(pays);

CREATE TABLE utilisateur (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cabinet_id          UUID NOT NULL REFERENCES cabinet(id) ON DELETE CASCADE,
    role_id             INTEGER NOT NULL REFERENCES ref_role_utilisateur(id),
    email               VARCHAR(100) NOT NULL,
    mot_de_passe_hash   VARCHAR(255) NOT NULL,
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    telephone           VARCHAR(30),
    fonction            VARCHAR(100), -- Associé, Manager, Senior, Junior
    signature_url       VARCHAR(500), -- image signature électronique
    est_actif           BOOLEAN DEFAULT TRUE,
    derniere_connexion  TIMESTAMPTZ,
    mfa_actif           BOOLEAN DEFAULT FALSE,
    mfa_secret          VARCHAR(255),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE(cabinet_id, email)
);

CREATE INDEX idx_utilisateur_cabinet ON utilisateur(cabinet_id);
CREATE INDEX idx_utilisateur_email ON utilisateur(email);
CREATE INDEX idx_utilisateur_actif ON utilisateur(est_actif);

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. TABLES MÉTIER — CLIENTS & MISSIONS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE client (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cabinet_id      UUID NOT NULL REFERENCES cabinet(id) ON DELETE CASCADE,
    raison_sociale  VARCHAR(200) NOT NULL,
    forme_juridique VARCHAR(50), -- SARL, SA, SAS, etc.
    rccm            VARCHAR(50),
    ifu             VARCHAR(50), -- Identifiant Fiscal Unique
    secteur_activite VARCHAR(100),
    adresse         TEXT,
    ville           VARCHAR(100),
    pays            VARCHAR(100) DEFAULT 'Côte d'Ivoire',
    telephone       VARCHAR(30),
    email           VARCHAR(100),
    contact_nom     VARCHAR(100),
    contact_fonction VARCHAR(100),
    contact_telephone VARCHAR(30),
    contact_email   VARCHAR(100),
    date_debut_relation DATE,
    statut          VARCHAR(20) DEFAULT 'actif',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_client_cabinet ON client(cabinet_id);
CREATE INDEX idx_client_statut ON client(statut);

CREATE TABLE mission (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cabinet_id          UUID NOT NULL REFERENCES cabinet(id) ON DELETE CASCADE,
    client_id           UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    type_mission_id     INTEGER NOT NULL REFERENCES ref_type_mission(id),
    statut_id           INTEGER NOT NULL REFERENCES ref_statut_mission(id),
    reference           VARCHAR(50) NOT NULL, -- référence interne du cabinet
    exercice_debut      DATE NOT NULL,
    exercice_fin        DATE NOT NULL,
    date_debut_mission  DATE,
    date_fin_prevue     DATE,
    date_fin_reelle     DATE,
    montant_honoraires  DECIMAL(15,2),
    devise              VARCHAR(3) DEFAULT 'XOF',
    objectif            TEXT, -- description de la mission
    lettre_mission_url  VARCHAR(500),
    contrat_url         VARCHAR(500),
    -- Équipe assignée
    associe_id          UUID REFERENCES utilisateur(id),
    manager_id          UUID REFERENCES utilisateur(id),
    senior_id           UUID REFERENCES utilisateur(id),
    junior_id           UUID REFERENCES utilisateur(id),
    -- Conformité
    independence_verifiee BOOLEAN DEFAULT FALSE,
    date_verif_independence DATE,
    -- Opinion
    type_opinion_id     INTEGER REFERENCES ref_type_opinion(id),
    date_signature_rapport DATE,
    -- Archivage
    archive_url         VARCHAR(500),
    date_archivage      TIMESTAMPTZ,
    duree_conservation_ans INTEGER DEFAULT 10,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE(cabinet_id, reference)
);

CREATE INDEX idx_mission_cabinet ON mission(cabinet_id);
CREATE INDEX idx_mission_client ON mission(client_id);
CREATE INDEX idx_mission_statut ON mission(statut_id);
CREATE INDEX idx_mission_exercice ON mission(exercice_fin);
CREATE INDEX idx_mission_equipe ON mission(associe_id, manager_id, senior_id, junior_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. TABLES MÉTIER — CYCLES ISA & RISQUES
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE mission_cycle (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id      UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    cycle_id        INTEGER NOT NULL REFERENCES ref_cycle_isa(id),
    -- Évaluation des risques
    risque_inherent VARCHAR(20), -- faible, modere, eleve, critique
    risque_controle VARCHAR(20),
    risque_detection VARCHAR(20),
    risque_global   VARCHAR(20),
    -- Assertions concernées
    assertions      VARCHAR(50), -- "E/O,C,V" format CSV
    -- Stratégie d'audit
    approche        VARCHAR(50), -- approche_par_les_risques, approche_par_les_cycles
    materielite     DECIMAL(15,2), -- seuil de matérialité
    -- Statut
    statut          VARCHAR(20) DEFAULT 'non_commence', -- non_commence, en_cours, en_revue, valide
    date_debut      DATE,
    date_fin        DATE,
    responsable_id  UUID REFERENCES utilisateur(id),
    -- Conclusion du cycle
    conclusion      TEXT,
    conclusion_date TIMESTAMPTZ,
    conclusion_par  UUID REFERENCES utilisateur(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mission_id, cycle_id)
);

CREATE INDEX idx_mission_cycle_mission ON mission_cycle(mission_id);
CREATE INDEX idx_mission_cycle_cycle ON mission_cycle(cycle_id);
CREATE INDEX idx_mission_cycle_statut ON mission_cycle(statut);

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. TABLES MÉTIER — TESTS DE CONTRÔLE & PROCÉDURES SUBSTANTIELLES
-- ───────────────────────────────────────────────────────────────────────────────

-- Programmes de travail (templates ISA par cycle)
CREATE TABLE programme_travail (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id        INTEGER NOT NULL REFERENCES ref_cycle_isa(id),
    type_test_id    INTEGER NOT NULL REFERENCES ref_type_test(id),
    ordre           INTEGER NOT NULL DEFAULT 0,
    code            VARCHAR(20) NOT NULL, -- ex: "TC-CASH-01"
    objectif        TEXT NOT NULL,
    procedure       TEXT NOT NULL,
    assertions      VARCHAR(50), -- "E/O,C,V"
    -- Paramètres
    echantillon_min INTEGER, -- taille minimale d'échantillon
    scoring_actif   BOOLEAN DEFAULT FALSE,
    score_max       INTEGER DEFAULT 100,
    -- Référence ISA
    isa_reference   VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programme_cycle ON programme_travail(cycle_id);
CREATE INDEX idx_programme_type ON programme_travail(type_test_id);

-- Tests exécutés dans une mission
CREATE TABLE test_execution (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_cycle_id    UUID NOT NULL REFERENCES mission_cycle(id) ON DELETE CASCADE,
    programme_id        UUID REFERENCES programme_travail(id),
    type_test_id        INTEGER NOT NULL REFERENCES ref_type_test(id),
    statut_id           INTEGER NOT NULL REFERENCES ref_statut_test(id),
    -- Référence
    reference           VARCHAR(50) NOT NULL,
    ordre               INTEGER NOT NULL DEFAULT 0,
    -- Contenu
    objectif            TEXT NOT NULL,
    procedure           TEXT NOT NULL,
    assertions          VARCHAR(50),
    -- Exécution
    echantillon_taille  INTEGER,
    echantillon_defaut  INTEGER, -- écarts détectés
    resultat            TEXT,
    score               INTEGER, -- 0-100 si scoring_actif
    conclusion          TEXT,
    -- Traçabilité
    execute_par         UUID REFERENCES utilisateur(id),
    date_execution      TIMESTAMPTZ,
    revu_par            UUID REFERENCES utilisateur(id),
    date_revue          TIMESTAMPTZ,
    -- Liens
    documents_preuves   JSONB DEFAULT '[]', -- ["doc_uuid_1", "doc_uuid_2"]
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_mission_cycle ON test_execution(mission_cycle_id);
CREATE INDEX idx_test_statut ON test_execution(statut_id);
CREATE INDEX idx_test_execute_par ON test_execution(execute_par);
CREATE INDEX idx_test_programme ON test_execution(programme_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. TABLES MÉTIER — DOCUMENTS & PIÈCES JUSTIFICATIVES
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE document (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id      UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    mission_cycle_id UUID REFERENCES mission_cycle(id) ON DELETE SET NULL,
    type_document_id INTEGER NOT NULL REFERENCES ref_type_document(id),
    statut_id       INTEGER NOT NULL REFERENCES ref_statut_document(id),
    -- Informations fichier
    nom_original    VARCHAR(255) NOT NULL,
    nom_stockage    VARCHAR(255) NOT NULL, -- nom unique côté stockage (S3/MinIO)
    chemin_stockage VARCHAR(500) NOT NULL,
    taille_octets   BIGINT,
    mime_type       VARCHAR(100),
    extension       VARCHAR(10),
    checksum_sha256 VARCHAR(64), -- intégrité du fichier
    -- Contenu extrait
    ocr_texte       TEXT, -- texte extrait par OCR
    ocr_confiance   DECIMAL(3,2), -- score OCR 0.00-1.00
    -- Métadonnées métier
    montant         DECIMAL(15,2), -- montant extrait (si applicable)
    date_document   DATE, -- date de la pièce
    numero_piece    VARCHAR(100), -- numéro de facture, relevé, etc.
    -- Traçabilité
    depose_par      UUID REFERENCES utilisateur(id), -- NULL si uploadé par le client
    client_upload   BOOLEAN DEFAULT FALSE, -- TRUE si uploadé via le portail client
    valide_par      UUID REFERENCES utilisateur(id),
    date_validation TIMESTAMPTZ,
    commentaire     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_mission ON document(mission_id);
CREATE INDEX idx_document_cycle ON document(mission_cycle_id);
CREATE INDEX idx_document_statut ON document(statut_id);
CREATE INDEX idx_document_type ON document(type_document_id);
CREATE INDEX idx_document_checksum ON document(checksum_sha256);

-- ───────────────────────────────────────────────────────────────────────────────
-- 7. TABLES MÉTIER — ANOMALIES & ÉCARTS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE anomalie (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id          UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    mission_cycle_id    UUID REFERENCES mission_cycle(id) ON DELETE SET NULL,
    test_execution_id   UUID REFERENCES test_execution(id) ON DELETE SET NULL,
    statut_id           INTEGER NOT NULL REFERENCES ref_statut_anomalie(id),
    -- Référence
    reference           VARCHAR(50) NOT NULL, -- ex: "A-2025-004"
    -- Description
    titre               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    assertion_concernee VARCHAR(50), -- "E/O", "C", etc.
    -- Impact
    montant_impact      DECIMAL(15,2),
    pourcentage_impact  DECIMAL(5,2), -- % par rapport au seuil de matérialité
    impact_significatif BOOLEAN DEFAULT FALSE,
    -- Ajustement
    ajustement_propose  TEXT,
    ajustement_montant  DECIMAL(15,2),
    ajustement_accepte  BOOLEAN,
    -- Workflow
    ouverte_par         UUID NOT NULL REFERENCES utilisateur(id),
    date_ouverture      TIMESTAMPTZ DEFAULT NOW(),
    assignee_a          UUID REFERENCES utilisateur(id),
    date_cloture        TIMESTAMPTZ,
    close_par           UUID REFERENCES utilisateur(id),
    conclusion          TEXT,
    -- Liens
    documents_lies      JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalie_mission ON anomalie(mission_id);
CREATE INDEX idx_anomalie_cycle ON anomalie(mission_cycle_id);
CREATE INDEX idx_anomalie_statut ON anomalie(statut_id);
CREATE INDEX idx_anomalie_reference ON anomalie(reference);
CREATE INDEX idx_anomalie_ouverte_par ON anomalie(ouverte_par);

-- Historique des changements de statut d'anomalie
CREATE TABLE anomalie_historique (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anomalie_id     UUID NOT NULL REFERENCES anomalie(id) ON DELETE CASCADE,
    statut_precedent INTEGER REFERENCES ref_statut_anomalie(id),
    statut_nouveau  INTEGER NOT NULL REFERENCES ref_statut_anomalie(id),
    commentaire     TEXT,
    modifie_par     UUID NOT NULL REFERENCES utilisateur(id),
    date_modification TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalie_hist_anomalie ON anomalie_historique(anomalie_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 8. TABLES MÉTIER — RAPPORTS D'AUDIT & REVUE QUALITÉ
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE rapport (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id          UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    type_rapport_id     INTEGER NOT NULL REFERENCES ref_type_rapport(id),
    type_opinion_id     INTEGER REFERENCES ref_type_opinion(id),
    -- Référence
    reference           VARCHAR(50) NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    -- Contenu
    titre               VARCHAR(255) NOT NULL,
    contenu             TEXT, -- texte complet du rapport (HTML/Markdown)
    -- Statut workflow
    statut              VARCHAR(20) DEFAULT 'brouillon', -- brouillon, en_revue, valide, signe, archive
    -- Signatures
    signe_par           UUID REFERENCES utilisateur(id),
    date_signature      TIMESTAMPTZ,
    -- Fichiers
    fichier_brouillon_url VARCHAR(500),
    fichier_final_url   VARCHAR(500),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rapport_mission ON rapport(mission_id);
CREATE INDEX idx_rapport_type ON rapport(type_rapport_id);
CREATE INDEX idx_rapport_statut ON rapport(statut);

-- Workflow de revue qualité
CREATE TABLE revue_qualite (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rapport_id      UUID NOT NULL REFERENCES rapport(id) ON DELETE CASCADE,
    mission_id      UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    -- Niveau de revue
    niveau          VARCHAR(20) NOT NULL, -- preparateur, senior, associe, partenaire
    relecteur_id    UUID NOT NULL REFERENCES utilisateur(id),
    -- Statut
    statut          VARCHAR(20) DEFAULT 'en_attente', -- en_attente, en_cours, valide, rejete
    -- Contenu
    commentaires    TEXT,
    points_attention JSONB DEFAULT '[]',
    -- Dates
    date_attribution TIMESTAMPTZ DEFAULT NOW(),
    date_debut      TIMESTAMPTZ,
    date_fin        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revue_rapport ON revue_qualite(rapport_id);
CREATE INDEX idx_revue_mission ON revue_qualite(mission_id);
CREATE INDEX idx_revue_relecteur ON revue_qualite(relecteur_id);
CREATE INDEX idx_revue_statut ON revue_qualite(statut);

-- ───────────────────────────────────────────────────────────────────────────────
-- 9. TABLES MÉTIER — BALANCES & DONNÉES COMPTABLES
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE balance_importee (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id      UUID NOT NULL REFERENCES mission(id) ON DELETE CASCADE,
    -- Informations fichier
    nom_fichier     VARCHAR(255) NOT NULL,
    chemin_stockage VARCHAR(500) NOT NULL,
    -- Métadonnées
    exercice        VARCHAR(10) NOT NULL, -- "2025"
    date_import     TIMESTAMPTZ DEFAULT NOW(),
    importe_par     UUID REFERENCES utilisateur(id),
    statut          VARCHAR(20) DEFAULT 'importee', -- importee, validee, rejetee
    -- Totaux
    total_actif     DECIMAL(15,2),
    total_passif    DECIMAL(15,2),
    ecart           DECIMAL(15,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_balance_mission ON balance_importee(mission_id);

-- Lignes de balance (SYSCOHADA)
CREATE TABLE balance_ligne (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    balance_id      UUID NOT NULL REFERENCES balance_importee(id) ON DELETE CASCADE,
    -- Compte SYSCOHADA
    numero_compte   VARCHAR(10) NOT NULL, -- ex: "521100", "244100"
    libelle_compte  VARCHAR(255) NOT NULL,
    classe          INTEGER NOT NULL, -- 1 à 8
    -- Soldes
    solde_debit_n   DECIMAL(15,2) DEFAULT 0,
    solde_credit_n  DECIMAL(15,2) DEFAULT 0,
    solde_debit_n1  DECIMAL(15,2) DEFAULT 0,
    solde_credit_n1 DECIMAL(15,2) DEFAULT 0,
    -- Variation
    variation_abs   DECIMAL(15,2) DEFAULT 0,
    variation_pct   DECIMAL(5,2) DEFAULT 0,
    -- Analyse auto
    anomalie_detectee BOOLEAN DEFAULT FALSE,
    type_anomalie   VARCHAR(50), -- ecart_significatif, solde_anormal, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_balance_ligne_balance ON balance_ligne(balance_id);
CREATE INDEX idx_balance_ligne_compte ON balance_ligne(numero_compte);
CREATE INDEX idx_balance_ligne_classe ON balance_ligne(classe);
CREATE INDEX idx_balance_ligne_anomalie ON balance_ligne(anomalie_detectee);

-- ───────────────────────────────────────────────────────────────────────────────
-- 10. TABLE — AUDIT TRAIL (TRAÇABILITÉ COMPLÈTE)
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_trail (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_activite_id INTEGER NOT NULL REFERENCES ref_type_activite(id),
    -- Contexte
    cabinet_id      UUID REFERENCES cabinet(id),
    mission_id      UUID REFERENCES mission(id),
    utilisateur_id  UUID REFERENCES utilisateur(id),
    -- Détails
    table_concernee VARCHAR(50),
    enregistrement_id UUID,
    action          VARCHAR(20) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, EXPORT, etc.
    donnees_avant   JSONB,
    donnees_apres   JSONB,
    description     TEXT,
    -- Technique
    adresse_ip      INET,
    user_agent      TEXT,
    session_id      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_type ON audit_trail(type_activite_id);
CREATE INDEX idx_audit_cabinet ON audit_trail(cabinet_id);
CREATE INDEX idx_audit_mission ON audit_trail(mission_id);
CREATE INDEX idx_audit_utilisateur ON audit_trail(utilisateur_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_created ON audit_trail(created_at);
CREATE INDEX idx_audit_table ON audit_trail(table_concernee, enregistrement_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 11. TABLE — NOTIFICATIONS
-- ───────────────────────────────────────────────────────────────────────────────

CREATE TABLE notification (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinataire_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    -- Contenu
    type            VARCHAR(50) NOT NULL, -- relance_document, nouvelle_anomalie, revue_qualite, etc.
    titre           VARCHAR(255) NOT NULL,
    message         TEXT,
    -- Cible
    mission_id      UUID REFERENCES mission(id) ON DELETE CASCADE,
    anomalie_id     UUID REFERENCES anomalie(id) ON DELETE CASCADE,
    document_id     UUID REFERENCES document(id) ON DELETE CASCADE,
    -- Canaux
    canal_email     BOOLEAN DEFAULT FALSE,
    canal_whatsapp  BOOLEAN DEFAULT FALSE,
    canal_inapp     BOOLEAN DEFAULT TRUE,
    -- Statut
    lu              BOOLEAN DEFAULT FALSE,
    date_lecture    TIMESTAMPTZ,
    -- Envoi
    date_envoi      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_destinataire ON notification(destinataire_id);
CREATE INDEX idx_notif_lu ON notification(lu);
CREATE INDEX idx_notif_mission ON notification(mission_id);

-- ───────────────────────────────────────────────────────────────────────────────
-- 12. VUES POUR REPORTING
-- ───────────────────────────────────────────────────────────────────────────────

-- Vue : synthèse mission
CREATE OR REPLACE VIEW v_mission_synthese AS
SELECT
    m.id AS mission_id,
    m.reference,
    c.raison_sociale AS client,
    cab.nom AS cabinet,
    sm.libelle AS statut,
    m.exercice_fin,
    m.date_debut_mission,
    m.date_fin_prevue,
    m.date_fin_reelle,
    COUNT(DISTINCT mc.id) AS nb_cycles,
    COUNT(DISTINCT te.id) AS nb_tests,
    COUNT(DISTINCT CASE WHEN te.statut_id = (SELECT id FROM ref_statut_test WHERE code = 'conforme') THEN te.id END) AS tests_conformes,
    COUNT(DISTINCT a.id) AS nb_anomalies,
    COUNT(DISTINCT CASE WHEN a.statut_id = (SELECT id FROM ref_statut_anomalie WHERE code = 'ouverte') THEN a.id END) AS anomalies_ouvertes,
    COUNT(DISTINCT d.id) AS nb_documents,
    m.montant_honoraires,
    m.created_at
FROM mission m
JOIN client c ON m.client_id = c.id
JOIN cabinet cab ON m.cabinet_id = cab.id
JOIN ref_statut_mission sm ON m.statut_id = sm.id
LEFT JOIN mission_cycle mc ON m.id = mc.mission_id
LEFT JOIN test_execution te ON mc.id = te.mission_cycle_id
LEFT JOIN anomalie a ON m.id = a.mission_id
LEFT JOIN document d ON m.id = d.mission_id
GROUP BY m.id, c.raison_sociale, cab.nom, sm.libelle;

-- Vue : progression par cycle
CREATE OR REPLACE VIEW v_cycle_progression AS
SELECT
    mc.id AS mission_cycle_id,
    m.reference AS mission_ref,
    c.raison_sociale AS client,
    rc.libelle AS cycle,
    mc.statut,
    mc.risque_global,
    COUNT(DISTINCT te.id) AS nb_tests,
    COUNT(DISTINCT CASE WHEN te.statut_id = (SELECT id FROM ref_statut_test WHERE code = 'conforme') THEN te.id END) AS tests_ok,
    COUNT(DISTINCT a.id) AS nb_anomalies,
    mc.date_debut,
    mc.date_fin,
    mc.conclusion
FROM mission_cycle mc
JOIN mission m ON mc.mission_id = m.id
JOIN client c ON m.client_id = c.id
JOIN ref_cycle_isa rc ON mc.cycle_id = rc.id
LEFT JOIN test_execution te ON mc.id = te.mission_cycle_id
LEFT JOIN anomalie a ON mc.id = a.mission_cycle_id
GROUP BY mc.id, m.reference, c.raison_sociale, rc.libelle, mc.statut, mc.risque_global, mc.date_debut, mc.date_fin, mc.conclusion;

-- ───────────────────────────────────────────────────────────────────────────────
-- 13. FONCTIONS & TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────────

-- Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cabinet_updated BEFORE UPDATE ON cabinet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_utilisateur_updated BEFORE UPDATE ON utilisateur
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_client_updated BEFORE UPDATE ON client
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mission_updated BEFORE UPDATE ON mission
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mission_cycle_updated BEFORE UPDATE ON mission_cycle
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_test_execution_updated BEFORE UPDATE ON test_execution
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_document_updated BEFORE UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_anomalie_updated BEFORE UPDATE ON anomalie
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rapport_updated BEFORE UPDATE ON rapport
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_revue_qualite_updated BEFORE UPDATE ON revue_qualite
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger : génération automatique de la référence d'anomalie
CREATE OR REPLACE FUNCTION generate_anomalie_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM NEW.date_ouverture)::TEXT;
    SELECT COUNT(*) + 1 INTO v_count
    FROM anomalie
    WHERE mission_id = NEW.mission_id
      AND EXTRACT(YEAR FROM date_ouverture) = EXTRACT(YEAR FROM NEW.date_ouverture);
    NEW.reference := 'A-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anomalie_reference BEFORE INSERT ON anomalie
    FOR EACH ROW EXECUTE FUNCTION generate_anomalie_reference();

-- Trigger : audit trail sur INSERT/UPDATE/DELETE des tables critiques
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_type_activite_id INTEGER;
    v_action VARCHAR(20);
    v_donnees_avant JSONB;
    v_donnees_apres JSONB;
BEGIN
    -- Déterminer l'action
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_donnees_apres := to_jsonb(NEW);
        v_donnees_avant := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_donnees_avant := to_jsonb(OLD);
        v_donnees_apres := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_donnees_avant := to_jsonb(OLD);
        v_donnees_apres := NULL;
    END IF;

    -- Récupérer le type d'activité générique
    SELECT id INTO v_type_activite_id
    FROM ref_type_activite
    WHERE code = 'GENERIC_' || v_action;

    IF v_type_activite_id IS NULL THEN
        v_type_activite_id := 1; -- fallback
    END IF;

    INSERT INTO audit_trail (
        type_activite_id, cabinet_id, mission_id, utilisateur_id,
        table_concernee, enregistrement_id, action,
        donnees_avant, donnees_apres, description, created_at
    ) VALUES (
        v_type_activite_id,
        NULL, -- cabinet_id sera NULL ici, à enrichir selon le contexte
        NULL,
        NULL, -- utilisateur_id à récupérer via current_setting si dispo
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        v_action,
        v_donnees_avant,
        v_donnees_apres,
        v_action || ' sur ' || TG_TABLE_NAME,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Appliquer l'audit trail sur les tables critiques
CREATE TRIGGER trg_audit_mission AFTER INSERT OR UPDATE OR DELETE ON mission
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_audit_mission_cycle AFTER INSERT OR UPDATE OR DELETE ON mission_cycle
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_audit_test_execution AFTER INSERT OR UPDATE OR DELETE ON test_execution
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_audit_anomalie AFTER INSERT OR UPDATE OR DELETE ON anomalie
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_audit_document AFTER INSERT OR UPDATE OR DELETE ON document
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_audit_rapport AFTER INSERT OR UPDATE OR DELETE ON rapport
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ───────────────────────────────────────────────────────────────────────────────
-- 14. DONNÉES DE SEED — RÉFÉRENTIELS ISA & SYSCOHADA
-- ───────────────────────────────────────────────────────────────────────────────

-- Types de mission
INSERT INTO ref_type_mission (code, libelle, description) VALUES
('audit_annuel', 'Audit annuel des états financiers', 'Audit externe complet des états financiers annuels'),
('audit_consolide', 'Audit des comptes consolidés', 'Audit des états financiers consolidés d'un groupe'),
('audit_limited', 'Audit à portée limitée', 'Audit portant sur des éléments spécifiques'),
('due_diligence', 'Due diligence financière', 'Examen approfondi pour une opération de fusion/acquisition'),
('review', 'Révision limitée', 'Revue des états financiers (niveau d'assurance moindre)');

-- Statuts de mission
INSERT INTO ref_statut_mission (code, libelle, couleur, ordre) VALUES
('prospect', 'Prospect', '#6B7280', 1),
('accepte', 'Mission acceptée', '#3B82F6', 2),
('planifie', 'Planifié', '#8B5CF6', 3),
('en_cours', 'En cours', '#F59E0B', 4),
('en_revue', 'En revue qualité', '#EC4899', 5),
('rapport', 'Rapport en rédaction', '#10B981', 6),
('signe', 'Rapport signé', '#059669', 7),
('archive', 'Archivé', '#6B7280', 8),
('annule', 'Annulé', '#EF4444', 9);

-- Cycles ISA (SYSCOHADA)
INSERT INTO ref_cycle_isa (code, libelle, description, classe_syscohada, ordre) VALUES
('cash', 'Cash & Trésorerie', 'Comptes de trésorerie, banques, caisse, effets à encaisser', 'Classe 5', 1),
('immobilisations', 'Immobilisations', 'Immobilisations corporelles, incorporelles, financières', 'Classe 2', 2),
('stocks', 'Stocks & Inventaire', 'Matières premières, produits finis, marchandises', 'Classe 3', 3),
('tiers', 'Tiers (Clients & Fournisseurs)', 'Créances clients, dettes fournisseurs, autres tiers', 'Classe 4', 4),
('emprunts', 'Emprunts & Dettes financières', 'Emprunts bancaires, dettes financières', 'Classe 1', 5),
('capitaux', 'Capitaux propres', 'Capital, réserves, résultat, subventions', 'Classe 1', 6),
('charges', 'Charges', 'Achats, services extérieurs, charges de personnel, impôts', 'Classe 6', 7),
('produits', 'Produits', 'Ventes, prestations, produits financiers, produits exceptionnels', 'Classe 7', 8),
('engagements', 'Engagements hors bilan', 'Lettres de crédit, cautions, garanties', 'Hors bilan', 9);

-- Assertions d'audit
INSERT INTO ref_assertion (code, libelle_fr, libelle_en, description) VALUES
('E/O', 'Existence / Obligations', 'Existence / Occurrence', 'Les actifs, passifs et transactions existent et sont réels'),
('C', 'Complétude', 'Completeness', 'Toutes les transactions, actifs et passifs sont comptabilisés'),
('V', 'Valuation', 'Valuation / Accuracy', 'Les montants sont correctement évalués et comptabilisés'),
('R/O', 'Droits / Obligations', 'Rights / Obligations', 'L'entité détient les droits sur les actifs et les obligations liées aux passifs'),
('P', 'Présentation', 'Presentation / Disclosure', 'Les éléments sont correctement présentés et divulgués');

-- Types de tests
INSERT INTO ref_type_test (code, libelle, description) VALUES
('test_controle', 'Test de contrôle', 'Vérification de l'efficacité des contrôles internes'),
('proc_substantielle', 'Procédure substantielle', 'Test direct sur les soldes ou les transactions'),
('analytique', 'Procédure analytique', 'Analyse de ratios, tendances et comparaisons'),
('circularisation', 'Circularisation', 'Demande de confirmation externe (banques, clients, fournisseurs)'),
('observation', 'Observation', 'Observation physique (inventaire, processus)'),
('inspection', 'Inspection', 'Examen visuel de documents et preuves');

-- Statuts de test
INSERT INTO ref_statut_test (code, libelle, couleur) VALUES
('non_commence', 'Non commencé', '#6B7280'),
('en_cours', 'En cours', '#F59E0B'),
('conforme', 'Conforme', '#10B981'),
('ecart', 'Écart détecté', '#EF4444'),
('na', 'Non applicable', '#9CA3AF'),
('a_creuser', 'À creuser', '#8B5CF6');

-- Statuts d'anomalie
INSERT INTO ref_statut_anomalie (code, libelle, couleur, ordre) VALUES
('ouverte', 'Ouverte', '#EF4444', 1),
('en_discussion', 'En discussion avec le client', '#F59E0B', 2),
('ajustement_propose', 'Ajustement proposé', '#8B5CF6', 3),
('ajustement_accepte', 'Ajustement accepté', '#3B82F6', 4),
('close', 'Close', '#10B981', 5),
('rejetee', 'Rejetée', '#6B7280', 6);

-- Types de documents
INSERT INTO ref_type_document (code, libelle, extensions) VALUES
('balance', 'Balance générale', 'xlsx,csv'),
('releve_bancaire', 'Relevé bancaire', 'pdf'),
('facture', 'Facture', 'pdf'),
('pv_inventaire', 'PV d'inventaire', 'pdf'),
('contrat', 'Contrat', 'pdf,docx'),
('etat_financier', 'État financier', 'xlsx,pdf'),
('circularisation', 'Réponse circularisation', 'pdf'),
('note_calcul', 'Note de calcul', 'xlsx,pdf'),
('justificatif', 'Justificatif divers', 'pdf,jpg,png'),
('rapport', 'Rapport d'audit', 'pdf');

-- Statuts de document
INSERT INTO ref_statut_document (code, libelle, couleur) VALUES
('en_attente', 'En attente', '#6B7280'),
('depose', 'Déposé', '#3B82F6'),
('en_revue', 'En revue', '#F59E0B'),
('valide', 'Validé', '#10B981'),
('rejete', 'Rejeté', '#EF4444'),
('a_completer', 'À compléter', '#8B5CF6');

-- Types de rapports
INSERT INTO ref_type_rapport (code, libelle, isa_reference) VALUES
('rapport_audit', 'Rapport d'audit des états financiers', 'ISA 700'),
('rapport_limited', 'Rapport de révision limitée', 'ISA 2400'),
('rapport_special', 'Rapport sur des éléments spécifiques', 'ISA 805'),
('lettre_management', 'Lettre aux dirigeants', NULL),
('rapport_interne', 'Rapport de contrôle interne', NULL);

-- Types d'opinion
INSERT INTO ref_type_opinion (code, libelle, isa_reference) VALUES
('sans_reserve', 'Opinion sans réserve', 'ISA 700'),
('avec_reserve', 'Opinion avec réserve', 'ISA 705'),
('defavorable', 'Opinion défavorable', 'ISA 705'),
('abstention', 'Abstention d'opinion', 'ISA 705'),
('sans_reserve_emphasis', 'Opinion sans réserve avec paragraphe d'insistance', 'ISA 706');

-- Rôles utilisateurs
INSERT INTO ref_role_utilisateur (code, libelle, niveau, permissions) VALUES
('super_admin', 'Super administrateur', 100, '{"all": true}'),
('admin_cabinet', 'Administrateur cabinet', 90, '{"cabinet": "full", "missions": "full", "users": "full"}'),
('associe', 'Associé', 80, '{"missions": "full", "rapports": "sign", "revue": "associe"}'),
('manager', 'Manager', 60, '{"missions": "full", "revue": "manager", "rapports": "read"}'),
('senior', 'Senior', 40, '{"missions": "write", "tests": "full", "revue": "senior"}'),
('junior', 'Junior', 20, '{"missions": "write", "tests": "write", "documents": "read"}'),
('client', 'Client (portail)', 5, '{"documents": "upload", "mission": "read_own"}');

-- Types d'activité
INSERT INTO ref_type_activite (code, libelle, categorie) VALUES
('AUTH_LOGIN', 'Connexion utilisateur', 'AUTH'),
('AUTH_LOGOUT', 'Déconnexion utilisateur', 'AUTH'),
('AUTH_FAIL', 'Échec de connexion', 'AUTH'),
('MISSION_CREATE', 'Création de mission', 'MISSION'),
('MISSION_UPDATE', 'Modification de mission', 'MISSION'),
('MISSION_DELETE', 'Suppression de mission', 'MISSION'),
('DOCUMENT_UPLOAD', 'Upload de document', 'DOCUMENT'),
('DOCUMENT_VALIDATE', 'Validation de document', 'DOCUMENT'),
('TEST_EXECUTE', 'Exécution de test', 'TEST'),
('TEST_REVIEW', 'Revue de test', 'TEST'),
('ANOMALY_CREATE', 'Création d'anomalie', 'ANOMALIE'),
('ANOMALY_UPDATE', 'Modification d'anomalie', 'ANOMALIE'),
('ANOMALY_CLOSE', 'Clôture d'anomalie', 'ANOMALIE'),
('RAPPORT_GENERATE', 'Génération de rapport', 'RAPPORT'),
('RAPPORT_SIGN', 'Signature de rapport', 'RAPPORT'),
('GENERIC_CREATE', 'Création générique', 'GENERIC'),
('GENERIC_UPDATE', 'Modification générique', 'GENERIC'),
('GENERIC_DELETE', 'Suppression générique', 'GENERIC');

-- ───────────────────────────────────────────────────────────────────────────────
-- 15. PROGRAMMES DE TRAVAIL ISA PRÉ-PARAMÉTRÉS (SEED)
-- ───────────────────────────────────────────────────────────────────────────────

-- CASH — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(1, 1, 1, 'TC-CASH-01', 'Vérifier la séparation des fonctions en trésorerie', 'Examiner l'organigramme, interviewer le responsable trésorerie, vérifier que l'approbation des paiements est distincte de l'exécution', 'E/O,C', 'ISA 315'),
(1, 1, 2, 'TC-CASH-02', 'Vérifier le rapprochement bancaire mensuel', 'Sélectionner un échantillon de 12 mois, vérifier que chaque relevé bancaire est rapproché avec la comptabilité et signé par un responsable', 'C,V', 'ISA 330'),
(1, 1, 3, 'TC-CASH-03', 'Vérifier la double signature pour les virements importants', 'Examiner la politique de signature, sélectionner un échantillon de 30 virements > seuil, vérifier la présence des deux signatures', 'E/O', 'ISA 330'),
(1, 1, 4, 'TC-CASH-04', 'Vérifier la sécurité des accès aux comptes bancaires', 'Examiner la matrice des accès bancaires, vérifier les droits d'accès, contrôler les changements d'accès en N', 'E/O,C', 'ISA 315');

-- CASH — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(1, 2, 5, 'PS-CASH-01', 'Confirmer les soldes bancaires par circularisation', 'Envoyer des lettres de circularisation à toutes les banques, comparer les réponses avec les soldes comptables', 'E/O,V', 'ISA 505'),
(1, 2, 6, 'PS-CASH-02', 'Vérifier les soldes de caisse par dénombrement', 'Effectuer un dénombrement physique de la caisse à la date de clôture ou à une date rapprochée', 'E/O,V', 'ISA 501'),
(1, 3, 7, 'PS-CASH-03', 'Analyse analytique des flux de trésorerie', 'Calculer les ratios trésorerie/CA, trésorerie/bfr. Comparer avec N-1 et le secteur. Identifier les écarts significatifs', 'V', 'ISA 520'),
(1, 2, 8, 'PS-CASH-04', 'Vérification des chèques en circulation', 'Examiner les chèques émis non encore débités, vérifier leur régularité et leur ancienneté', 'C,V', 'ISA 501');

-- IMMOBILISATIONS — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(2, 1, 1, 'TC-IMMO-01', 'Vérifier le processus d'approbation des acquisitions', 'Examiner la politique d'investissement, vérifier que chaque acquisition > seuil est approuvée par le CA ou le DG', 'E/O', 'ISA 315'),
(2, 1, 2, 'TC-IMMO-02', 'Vérifier le suivi du registre des immobilisations', 'Examiner le registre, vérifier la mise à jour après chaque acquisition/cession, contrôler la réconciliation avec la comptabilité', 'C,V', 'ISA 330');

-- IMMOBILISATIONS — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(2, 2, 3, 'PS-IMMO-01', 'Vérification des acquisitions N', 'Sélectionner un échantillon de 25 factures d'acquisition, vérifier la présence du bon de commande, du PV de réception, de la facture', 'E/O,V', 'ISA 501'),
(2, 2, 4, 'PS-IMMO-02', 'Recalcul des amortissements', 'Sélectionner un échantillon de 20 immobilisations, recalculer la dotation d'amortissement de l'exercice', 'V', 'ISA 501'),
(2, 2, 5, 'PS-IMMO-03', 'Vérification des cessions et sorties', 'Examiner le registre des cessions, vérifier les PV de sortie, recalculer les plus/moins-values', 'C,V', 'ISA 501'),
(2, 5, 6, 'PS-IMMO-04', 'Inventaire physique des immobilisations', 'Sélectionner un échantillon de 15 immobilisations, vérifier leur existence physique et leur état', 'E/O', 'ISA 501');

-- TIERS — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(4, 1, 1, 'TC-TIER-01', 'Vérifier le processus de validation des factures fournisseurs', 'Examiner le circuit de validation, vérifier que chaque facture est approuvée avant paiement', 'E/O,C', 'ISA 315'),
(4, 1, 2, 'TC-TIER-02', 'Vérifier le rapprochement des relevés fournisseurs', 'Sélectionner un échantillon de 10 fournisseurs majeurs, vérifier le rapprochement mensuel/trimestriel', 'C,V', 'ISA 330');

-- TIERS — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(4, 4, 3, 'PS-TIER-01', 'Circularisation des soldes clients', 'Sélectionner un échantillon de 20 clients (valeur + ancienneté), envoyer lettres de circularisation', 'E/O,V', 'ISA 505'),
(4, 4, 4, 'PS-TIER-02', 'Circularisation des soldes fournisseurs', 'Sélectionner un échantillon de 15 fournisseurs majeurs, envoyer lettres de circularisation', 'E/O,V', 'ISA 505'),
(4, 3, 5, 'PS-TIER-03', 'Analyse de l'ancienneté des créances clients', 'Préparer un tableau d'ancienneté, identifier les créances douteuses, vérifier les provisions', 'V', 'ISA 540'),
(4, 2, 6, 'PS-TIER-04', 'Vérification des écritures de régularisation fin d'exercice', 'Examiner les écritures de régularisation (factures à recevoir/à établir), vérifier leur justification', 'C,V', 'ISA 501');

-- STOCKS — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(3, 1, 1, 'TC-STOCK-01', 'Vérifier le processus d'inventaire physique', 'Examiner la procédure d'inventaire, vérifier la présence de compteurs indépendants, la méthode de comptage', 'E/O,C', 'ISA 315'),
(3, 1, 2, 'TC-STOCK-02', 'Vérifier le suivi des entrées/sorties de stocks', 'Examiner les bons de livraison, les bons de sortie, vérifier leur enregistrement comptable', 'C', 'ISA 330');

-- STOCKS — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(3, 5, 3, 'PS-STOCK-01', 'Observation de l'inventaire physique', 'Assister à l'inventaire physique, observer les méthodes de comptage, effectuer des comptages de contrôle', 'E/O', 'ISA 501'),
(3, 2, 4, 'PS-STOCK-02', 'Vérification de l'évaluation des stocks', 'Examiner la méthode d'évaluation (FIFO, CMUP), vérifier le calcul du coût d'acquisition, identifier les stocks obsolètes', 'V', 'ISA 540'),
(3, 3, 5, 'PS-STOCK-03', 'Analyse des rotations de stocks', 'Calculer le ratio de rotation, identifier les stocks à faible rotation, vérifier les dépréciations', 'V', 'ISA 520');

-- CHARGES — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(7, 1, 1, 'TC-CHRG-01', 'Vérifier le processus de validation des achats', 'Examiner le circuit d'achat, vérifier la séparation des fonctions (demandeur, acheteur, réceptionnaire)', 'E/O,C', 'ISA 315'),
(7, 1, 2, 'TC-CHRG-02', 'Vérifier le contrôle des factures fournisseurs', 'Sélectionner un échantillon de 20 factures, vérifier la concordance bon de commande / bon de réception / facture', 'E/O,V', 'ISA 330');

-- CHARGES — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(7, 2, 3, 'PS-CHRG-01', 'Test de cut-off (charges)', 'Sélectionner un échantillon de 15 factures des 5 derniers jours de N et 5 premiers jours de N+1, vérifier le rattachement à l'exercice correct', 'C,V', 'ISA 501'),
(7, 3, 4, 'PS-CHRG-02', 'Analyse analytique des charges', 'Comparer les charges par poste avec N-1, calculer les ratios (charges/CA, masse salariale/Effectif), identifier les écarts', 'V', 'ISA 520'),
(7, 2, 5, 'PS-CHRG-03', 'Vérification des charges à payer et charges constatées d'avance', 'Examiner les écritures de régularisation, vérifier leur calcul et leur justification', 'C,V', 'ISA 501');

-- PRODUITS — Tests de contrôle
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(8, 1, 1, 'TC-PROD-01', 'Vérifier le processus de reconnaissance du chiffre d'affaires', 'Examiner la politique de reconnaissance, vérifier que les critères de transfert des risques sont respectés', 'E/O,C', 'ISA 315'),
(8, 1, 2, 'TC-PROD-02', 'Vérifier le suivi des livraisons', 'Examiner les bons de livraison, vérifier leur concordance avec les factures', 'C', 'ISA 330');

-- PRODUITS — Procédures substantielles
INSERT INTO programme_travail (cycle_id, type_test_id, ordre, code, objectif, procedure, assertions, isa_reference) VALUES
(8, 2, 3, 'PS-PROD-01', 'Test de cut-off (produits)', 'Sélectionner un échantillon de 15 factures des 5 derniers jours de N et 5 premiers jours de N+1, vérifier le rattachement', 'C,V', 'ISA 501'),
(8, 3, 4, 'PS-PROD-02', 'Analyse analytique du chiffre d'affaires', 'Comparer le CA avec N-1, analyser par segment/produit, calculer les ratios (prix moyen, quantité)', 'V', 'ISA 520'),
(8, 2, 5, 'PS-PROD-03', 'Vérification des produits à recevoir', 'Examiner les écritures de régularisation, vérifier les travaux non facturés à la clôture', 'C,V', 'ISA 501');

-- ───────────────────────────────────────────────────────────────────────────────
-- 16. COMMENTAIRES & DOCUMENTATION
-- ───────────────────────────────────────────────────────────────────────────────

COMMENT ON SCHEMA auditflow IS 'Schéma principal de l'application AUDITFLOW - SaaS d'audit externe zone OHADA';
COMMENT ON TABLE cabinet IS 'Cabinets d'audit inscrits sur la plateforme (multi-tenant)';
COMMENT ON TABLE mission IS 'Missions d'audit externes';
COMMENT ON TABLE mission_cycle IS 'Cycles ISA exécutés au sein d'une mission';
COMMENT ON TABLE test_execution IS 'Tests de contrôle et procédures substantielles exécutés';
COMMENT ON TABLE anomalie IS 'Anomalies et écarts identifiés durant l'audit';
COMMENT ON TABLE document IS 'Pièces justificatives et documents de l'audit';
COMMENT ON TABLE rapport IS 'Rapports d'audit générés';
COMMENT ON TABLE audit_trail IS 'Journal d'audit complet pour traçabilité réglementaire';
COMMENT ON TABLE balance_importee IS 'Balances comptables SYSCOHADA importées';
COMMENT ON TABLE balance_ligne IS 'Lignes détaillées des balances importées';

-- ───────────────────────────────────────────────────────────────────────────────
-- FIN DU SCHÉMA
-- ─────────────────────────────────══════════════════════════════════════════════
