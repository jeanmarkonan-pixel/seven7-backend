import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface AuthenticatedUser {
  id: string;
  cabinetId: string;
  email: string;
  nom: string;
  prenom: string;
  roleCode: string;
  roleNiveau: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET manquant — voir .env.example');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Revalide sur CHAQUE requête que le compte existe encore et est actif,
   * plutôt que de faire confiance aveuglément au contenu du JWT : un token
   * signé reste valide jusqu'à expiration même si le compte est désactivé
   * entre-temps (offboarding, §11.2 du plan de conformité).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: payload.sub, deleted_at: null, est_actif: true },
      include: { ref_role_utilisateur: true },
    });

    if (!user) {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    return {
      id: user.id,
      cabinetId: user.cabinet_id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      roleCode: user.ref_role_utilisateur.code,
      roleNiveau: user.ref_role_utilisateur.niveau,
    };
  }
}
