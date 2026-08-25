import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MinNiveau } from '../auth/decorators/min-niveau.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@MinNiveau(90) // admin_cabinet et super_admin uniquement — plan de conformité §5.1
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crée un utilisateur dans le cabinet de l’appelant' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste les utilisateurs visibles par l’appelant' })
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.users.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un utilisateur' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.findOne(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifie un utilisateur (rôle, statut, mot de passe, etc.)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, actor, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime (logiquement) un utilisateur' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.users.remove(id, actor);
  }
}
