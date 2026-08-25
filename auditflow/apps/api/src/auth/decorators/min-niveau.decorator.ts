import { SetMetadata } from '@nestjs/common';

export const MIN_NIVEAU_KEY = 'minNiveau';

/**
 * Restreint un handler aux rôles dont le niveau hiérarchique est >= au seuil.
 * Niveaux : client=5, junior=20, senior=40, manager=60, associe=80,
 * admin_cabinet=90, super_admin=100 (ref_role_utilisateur.niveau).
 * Préférable à @Roles() quand la règle est "au moins Manager", pas une
 * liste de rôles précis à maintenir à chaque ajout de rôle.
 */
export const MinNiveau = (niveau: number) => SetMetadata(MIN_NIVEAU_KEY, niveau);
