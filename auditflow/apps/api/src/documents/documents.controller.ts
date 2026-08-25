import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

const STAFF_ROLES = ['super_admin', 'admin_cabinet', 'associe', 'manager', 'senior', 'junior'];
// Plan de conformité §5.1, colonne Documents : associe et junior n'ont que
// "Lecture" ici — troisième répartition distincte observée dans ce module
// (différente de Tests, différente d'Anomalies).
const WRITE_ROLES = ['super_admin', 'admin_cabinet', 'manager', 'senior'];

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('missions/:missionId/documents')
  @Roles(...WRITE_ROLES)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Dépose une pièce justificative sur une mission' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(missionId, actor, dto, file);
  }

  @Get('missions/:missionId/documents')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Liste les documents d’une mission' })
  findAll(@Param('missionId', ParseUUIDPipe) missionId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documents.findAll(missionId, actor);
  }

  @Get('documents/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Métadonnées d’un document' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documents.findOne(id, actor);
  }

  @Get('documents/:id/telecharger')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Télécharge le fichier original' })
  async telecharger(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const { chemin, nomOriginal, mime } = await this.documents.cheminDisque(id, actor);
    const stream = this.documents.streamDepuisChemin(chemin);
    return new StreamableFile(stream, {
      type: mime,
      disposition: `attachment; filename="${encodeURIComponent(nomOriginal)}"`,
    });
  }

  @Patch('documents/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifie ou valide un document' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documents.update(id, actor, dto);
  }

  // Pas de suppression : document n'a pas de deleted_at dans le schéma —
  // lecture délibérée comme intégrité des preuves d'audit (ISA 500),
  // pas un oubli. Voir README.
}
