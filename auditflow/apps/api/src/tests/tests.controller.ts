import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateTestDto } from './dto/create-test.dto';
import { RecordExecutionDto } from './dto/record-execution.dto';
import { TestsService } from './tests.service';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Contrairement à /missions et /mission-cycles : le plan de conformité
// §5.1 donne "CRUD" (sans réserve) à junior sur la colonne Tests, à la
// différence de son "CRUD (limité)" sur Missions. Junior écrit donc ici.
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior', 'junior'];
// La revue exige un profil senior+ ; re-vérifié dans TestsService.review()
// (niveau ET séparation des tâches), ce guard n'est qu'un premier filtre.
const REVIEW_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior'];

@ApiTags('tests')
@ApiBearerAuth()
@Controller()
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Post('mission-cycles/:cycleId/tests')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Crée un test (depuis le catalogue ou libre) dans un cycle' })
  create(
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateTestDto,
  ) {
    return this.tests.create(cycleId, actor, dto);
  }

  @Get('mission-cycles/:cycleId/tests')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les tests d’un cycle' })
  findAll(@Param('cycleId', ParseUUIDPipe) cycleId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tests.findAll(cycleId, actor);
  }

  @Get('tests/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Détail d’un test' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tests.findOne(id, actor);
  }

  @Patch('tests/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Enregistre l’exécution d’un test (résultat, score, conclusion)' })
  recordExecution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RecordExecutionDto,
  ) {
    return this.tests.recordExecution(id, actor, dto);
  }

  @Post('tests/:id/revue')
  @Roles(...REVIEW_ROLES)
  @ApiOperation({ summary: 'Marque un test comme revu par l’appelant (séparation des tâches, ISA 220)' })
  review(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tests.review(id, actor);
  }
}
