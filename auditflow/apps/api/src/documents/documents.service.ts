import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { MissionsService } from '../missions/missions.service';
import { PrismaService } from '../prisma/prisma.service';
import { detectMagicBytes } from './magic-bytes';
import type { UpdateDocumentDto } from './dto/update-document.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo

@Injectable()
export class DocumentsService {
  private readonly storageDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly missions: MissionsService,
    config: ConfigService,
  ) {
    // Placeholder disque local — le plan de conformité §8.1 prévoit MinIO/S3
    // chiffré (SSE-S3/SSE-C) en production. Ni Docker ni MinIO ne sont
    // disponibles dans cet environnement de développement ; le stockage
    // reste néanmoins fonctionnel et vérifiable, chemin_stockage recevant
    // ce qui serait une clé d'objet S3 le jour de la bascule.
    this.storageDir = config.get<string>('DOCUMENTS_STORAGE_DIR') ?? join(process.cwd(), 'storage');
  }

  private async resolveType(code: string) {
    const type = await this.prisma.ref_type_document.findUnique({ where: { code } });
    if (!type) throw new BadRequestException(`Type de document inconnu : ${code}`);
    return type;
  }

  private async resolveStatut(code: string) {
    const statut = await this.prisma.ref_statut_document.findUnique({ where: { code } });
    if (!statut) throw new BadRequestException(`Statut de document inconnu : ${code}`);
    return statut;
  }

  async upload(missionId: string, actor: AuthenticatedUser, dto: UploadDocumentDto, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    if (file.size > TAILLE_MAX_OCTETS) {
      throw new BadRequestException(`Fichier trop volumineux (max ${TAILLE_MAX_OCTETS / 1024 / 1024} Mo)`);
    }

    const mission = await this.missions.findOne(missionId, actor);
    const type = await this.resolveType(dto.typeDocumentCode);
    const statutDepose = await this.resolveStatut('depose');

    // Type réel du contenu, jamais le Content-Type déclaré par le client
    // (falsifiable). Rejet si le fichier ne correspond à aucun format admis
    // pour une pièce d'audit — voir magic-bytes.ts.
    const detected = detectMagicBytes(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'Type de fichier non reconnu ou non autorisé (formats acceptés : PDF, PNG, JPEG, TIFF, DOCX/XLSX)',
      );
    }

    if (dto.missionCycleId) {
      const cycle = await this.prisma.mission_cycle.findFirst({
        where: { id: dto.missionCycleId, mission_id: missionId },
      });
      if (!cycle) throw new BadRequestException('missionCycleId : cycle introuvable sur cette mission');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const nomStockage = `${randomUUID()}.${detected.extension}`;
    const dossierCabinet = join(this.storageDir, mission.cabinet_id);
    await mkdir(dossierCabinet, { recursive: true });
    const cheminComplet = join(dossierCabinet, nomStockage);
    await writeFile(cheminComplet, file.buffer);

    return this.prisma.document.create({
      data: {
        mission_id: missionId,
        mission_cycle_id: dto.missionCycleId,
        type_document_id: type.id,
        statut_id: statutDepose.id,
        nom_original: file.originalname,
        nom_stockage: nomStockage,
        // Chemin relatif au cabinet — ce champ deviendra la clé d'objet S3
        // (ex. "cabinets/<id>/documents/<uuid>.pdf") sans changer de forme.
        chemin_stockage: join(mission.cabinet_id, nomStockage),
        taille_octets: BigInt(file.size),
        mime_type: detected.mime,
        extension: detected.extension,
        checksum_sha256: checksum,
        montant: dto.montant,
        date_document: dto.dateDocument ? new Date(dto.dateDocument) : undefined,
        numero_piece: dto.numeroPiece,
        depose_par: actor.id,
        client_upload: false, // portail client non implémenté (voir README)
      },
      include: { ref_type_document: true, ref_statut_document: true },
    });
  }

  async findAll(missionId: string, actor: AuthenticatedUser) {
    await this.missions.findOne(missionId, actor);
    return this.prisma.document.findMany({
      where: { mission_id: missionId },
      include: { ref_type_document: true, ref_statut_document: true },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { ref_type_document: true, ref_statut_document: true, mission: true },
    });
    if (!doc) return null;
    if (actor.roleCode !== 'super_admin' && doc.mission.cabinet_id !== actor.cabinetId) return null;
    return doc;
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const doc = await this.findVisible(id, actor);
    if (!doc) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    return doc;
  }

  /** Chemin disque réel du fichier, pour le contrôleur qui le streame en réponse. */
  async cheminDisque(id: string, actor: AuthenticatedUser): Promise<{ chemin: string; nomOriginal: string; mime: string }> {
    const doc = await this.findOne(id, actor);
    return {
      chemin: join(this.storageDir, doc.chemin_stockage),
      nomOriginal: doc.nom_original,
      mime: doc.mime_type ?? 'application/octet-stream',
    };
  }

  streamDepuisChemin(chemin: string) {
    return createReadStream(chemin);
  }

  async update(id: string, actor: AuthenticatedUser, dto: UpdateDocumentDto) {
    const doc = await this.findOne(id, actor);
    const statut = dto.statutCode ? await this.resolveStatut(dto.statutCode) : undefined;
    const validation = statut?.code === 'valide';

    return this.prisma.document.update({
      where: { id: doc.id },
      data: {
        ...(statut && { statut_id: statut.id }),
        ...(validation && { valide_par: actor.id, date_validation: new Date() }),
        ...(dto.numeroPiece !== undefined && { numero_piece: dto.numeroPiece }),
        ...(dto.montant !== undefined && { montant: dto.montant }),
        ...(dto.dateDocument !== undefined && { date_document: dto.dateDocument ? new Date(dto.dateDocument) : null }),
        ...(dto.commentaire !== undefined && { commentaire: dto.commentaire }),
        updated_at: new Date(),
      },
      include: { ref_type_document: true, ref_statut_document: true },
    });
  }
}
