import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { MIN_NIVEAU_KEY } from '../decorators/min-niveau.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

/**
 * S'applique après JwtAuthGuard : suppose que request.user est déjà posé.
 * Sans @Roles()/@MinNiveau() sur le handler, l'accès est autorisé — être
 * authentifié suffit. Utiliser ce guard sur un handler sans JwtAuthGuard
 * avant lui ferait planter la lecture de request.user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const minNiveau = this.reflector.getAllAndOverride<number | undefined>(MIN_NIVEAU_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && minNiveau === undefined) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user) {
      throw new ForbiddenException('Authentification requise');
    }

    if (minNiveau !== undefined && user.roleNiveau < minNiveau) {
      throw new ForbiddenException('Privilèges insuffisants pour cette action');
    }

    if (requiredRoles && !requiredRoles.includes(user.roleCode)) {
      throw new ForbiddenException('Privilèges insuffisants pour cette action');
    }

    return true;
  }
}
