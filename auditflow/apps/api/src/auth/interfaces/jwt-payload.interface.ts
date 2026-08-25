export interface JwtPayload {
  /** id de l'utilisateur (utilisateur.id) */
  sub: string;
  cabinetId: string;
  roleCode: string;
  roleNiveau: number;
}
