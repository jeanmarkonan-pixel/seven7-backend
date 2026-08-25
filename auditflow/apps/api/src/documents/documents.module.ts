import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { MissionsModule } from '../missions/missions.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    MissionsModule,
    // Sans option de stockage, Multer garde le fichier en mémoire (buffer) —
    // nécessaire pour sniffer les octets magiques avant toute écriture disque.
    MulterModule.register({}),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
