export interface JwtPayload {
  /** id de l'utilisateur (utilisateur.id) */
  sub: string;
  cabinetId: string;
  roleCode: string;
  roleNiveau: number;
  /**
   * Copie de ref_role_utilisateur.permissions au moment du login.
   *
   * Forme volontairement non uniforme : {"all": true} pour super_admin,
   * sinon des paires ressource -> niveau où le niveau n'est PAS un enum
   * cohérent ("full"/"read"/"write" mais aussi "sign", "upload",
   * "read_own", et pour la clé "revue" un nom de RÔLE — "associe",
   * "manager" — pas un niveau d'accès). Un comparateur générique de type
   * "write < full" serait donc faux dès la clé "revue". À consulter au
   * cas par cas dans chaque handler, jamais via un guard générique.
   */
  permissions: Record<string, unknown>;
}
