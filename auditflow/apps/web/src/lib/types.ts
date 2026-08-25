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
  ref_cycle_isa: { code: string; libelle: string; ordre: number };
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

/** Rôles autorisés côté API à créer une mission (missions.controller.ts, WRITE_ROLES). */
export const MISSION_WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];
