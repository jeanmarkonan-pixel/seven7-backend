import { Module } from '@nestjs/common';

import { MissionsModule } from '../missions/missions.module';
import { RapportsController } from './rapports.controller';
import { RapportsService } from './rapports.service';

@Module({
  imports: [MissionsModule],
  controllers: [RapportsController],
  providers: [RapportsService],
  exports: [RapportsService], // RevuesQualiteService valide rapportId via cette classe
})
export class RapportsModule {}
