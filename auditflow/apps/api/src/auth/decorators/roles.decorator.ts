import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restreint un handler aux utilisateurs dont le rôle a l'un de ces codes.
 * Codes valides : super_admin, admin_cabinet, associe, manager, senior,
 * junior, client (voir ref_role_utilisateur en base).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
