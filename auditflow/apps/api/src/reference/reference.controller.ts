import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Données de référence globales (cycles ISA, catalogue de tests) — pas de
 * cabinet_id, partagées par toute la plateforme. Lecture ouverte à tout
 * utilisateur authentifié, y compris junior et client : ce sont des
 * définitions, pas des données d'un cabinet.
 */
@ApiTags('reference')
@ApiBearerAuth()
@Controller()
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('cycles-isa')
  @ApiOperation({ summary: 'Liste les 9 cycles ISA du référentiel (cash, immobilisations, stocks...)' })
  cyclesIsa() {
    return this.prisma.ref_cycle_isa.findMany({
      where: { actif: true },
      orderBy: { ordre: 'asc' },
    });
  }

  @Get('programmes-travail')
  @ApiQuery({ name: 'cycleId', required: false, type: Number })
  @ApiOperation({ summary: 'Catalogue des tests standards par cycle ISA, pré-paramétrés avec objectif/procédure ISA' })
  programmesTravail(@Query('cycleId') cycleId?: string) {
    return this.prisma.programme_travail.findMany({
      where: cycleId ? { cycle_id: Number(cycleId) } : {},
      include: { ref_cycle_isa: true, ref_type_test: true },
      orderBy: [{ cycle_id: 'asc' }, { ordre: 'asc' }],
    });
  }

  @Get('types-mission')
  @ApiOperation({ summary: 'Types de mission (ref_type_mission) : audit_annuel, audit_consolide, audit_limited, due_diligence, review' })
  typesMission() {
    return this.prisma.ref_type_mission.findMany({ orderBy: { id: 'asc' } });
  }

  @Get('statuts-test')
  @ApiOperation({ summary: 'Statuts de test (ref_statut_test) : non_commence, en_cours, conforme, ecart, na, a_creuser' })
  statutsTest() {
    return this.prisma.ref_statut_test.findMany({ orderBy: { id: 'asc' } });
  }
}
