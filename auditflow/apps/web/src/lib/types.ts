export interface Mission {
  id: string;
  reference: string;
  exercice_debut: string;
  exercice_fin: string;
  objectif: string | null;
  client: { id: string; raison_sociale: string };
  ref_type_mission: { code: string; libelle: string };
  ref_statut_mission: { code: string; libelle: string; couleur: string };
}

export interface MissionCycle {
  id: string;
  statut: string;
  risque_global: string | null;
  materielite: string | null;
  ref_cycle_isa: { id: number; code: string; libelle: string; ordre: number };
}

export interface Client {
  id: string;
  raison_sociale: string;
  secteur_activite: string | null;
}

export interface TypeMission {
  id: number;
  code: string;
  libelle: string;
}

export interface CycleIsa {
  id: number;
  code: string;
  libelle: string;
  ordre: number;
}

export interface ProgrammeTravail {
  id: string;
  code: string;
  objectif: string;
  procedure: string;
  isa_reference: string | null;
  ref_type_test: { code: string; libelle: string };
}

export interface Test {
  id: string;
  reference: string;
  objectif: string;
  procedure: string;
  resultat: string | null;
  score: number | null;
  conclusion: string | null;
  execute_par: string | null;
  date_execution: string | null;
  revu_par: string | null;
  date_revue: string | null;
  ref_type_test: { code: string; libelle: string };
  ref_statut_test: { code: string; libelle: string; couleur: string };
  mission_cycle?: { id: string; mission_id: string };
}

export interface StatutTest {
  id: number;
  code: string;
  libelle: string;
  couleur: string;
}

/** Rôles autorisés côté API à créer une mission (missions.controller.ts, WRITE_ROLES). */
export const MISSION_WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];

/** Mêmes rôles que missions — ouvrir un cycle est un acte de planification (mission-cycles.controller.ts). */
export const CYCLE_WRITE_ROLES = MISSION_WRITE_ROLES;

/** junior en plus : CRUD complet sur les tests, contrairement aux missions/cycles (tests.controller.ts). */
export const TEST_WRITE_ROLES = [...MISSION_WRITE_ROLES, 'junior'];

/** Revue d'un test (tests.controller.ts, REVIEW_ROLES) — vérifiée en profondeur côté API (niveau + séparation des tâches). */
export const TEST_REVIEW_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior'];

export interface Anomalie {
  id: string;
  reference: string;
  titre: string;
  description: string;
  assertion_concernee: string | null;
  montant_impact: string | null;
  pourcentage_impact: string | null;
  impact_significatif: boolean;
  ouverte_par: string;
  date_ouverture: string;
  assignee_a: string | null;
  close_par: string | null;
  date_cloture: string | null;
  conclusion: string | null;
  ref_statut_anomalie: { code: string; libelle: string; couleur: string };
  mission_id?: string;
}

export interface AnomalieHistoriqueEntry {
  id: string;
  commentaire: string | null;
  modifie_par: string;
  date_modification: string;
  ref_statut_anomalie_anomalie_historique_statut_precedentToref_statut_anomalie: { libelle: string } | null;
  ref_statut_anomalie_anomalie_historique_statut_nouveauToref_statut_anomalie: { libelle: string };
}

export interface StatutAnomalie {
  id: number;
  code: string;
  libelle: string;
  couleur: string;
}

/**
 * anomalies.controller.ts, WRITE_ROLES — associe a CRUD ici (contrairement
 * à son "Lecture" sur missions/tests/documents), junior n'a que Lecture
 * (contrairement à son CRUD complet sur tests) : pattern inverse de
 * TEST_WRITE_ROLES, pas une variante.
 */
export const ANOMALIE_WRITE_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior'];
