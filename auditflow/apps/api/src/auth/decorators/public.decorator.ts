import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Exempte un handler du JwtAuthGuard global. À poser explicitement sur
 * chaque route qui doit rester accessible sans jeton (login, health check) —
 * le défaut du guard global est de tout fermer, pas l'inverse.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
