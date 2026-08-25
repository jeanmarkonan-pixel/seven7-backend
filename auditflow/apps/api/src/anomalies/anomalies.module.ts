import { Module } from '@nestjs/common';

import { MissionsModule } from '../missions/missions.module';
import { AnomaliesController } from './anomalies.controller';
import { AnomaliesService } from './anomalies.service';

@Module({
  imports: [MissionsModule],
  controllers: [AnomaliesController],
  providers: [AnomaliesService],
})
export class AnomaliesModule {}
