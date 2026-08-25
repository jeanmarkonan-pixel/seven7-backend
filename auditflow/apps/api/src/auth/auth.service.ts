import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

export interface LoginResult {
  access_token: string;
  user: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    roleCode: string;
    cabinetId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResult> {
    // email n'est unique que par cabinet (@@unique([cabinet_id, email]) du
    // schéma) : deux cabinets peuvent avoir un utilisateur de même email.
    // findFirst() suffit ici car le login se fait par email seul pour l'instant ;
    // passer à un couple (cabinet, email) sera nécessaire si deux comptes
    // du même email existent dans des cabinets différents.
    const user = await this.prisma.utilisateur.findFirst({
      where: { email, deleted_at: null, est_actif: true },
      include: { ref_role_utilisateur: true },
    });

    // Même message générique dans les deux cas (utilisateur inconnu / mot
    // de passe faux) : ne pas révéler si un email existe en base.
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordValid = await bcrypt.compare(password, user.mot_de_passe_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { derniere_connexion: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      cabinetId: user.cabinet_id,
      roleCode: user.ref_role_utilisateur.code,
      roleNiveau: user.ref_role_utilisateur.niveau,
    };

    return {
      access_token: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        roleCode: user.ref_role_utilisateur.code,
        cabinetId: user.cabinet_id,
      },
    };
  }

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
}
