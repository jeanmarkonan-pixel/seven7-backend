import { Module } from '@nestjs/common';

import { MissionsModule } from '../missions/missions.module';
import { MissionCyclesController } from './mission-cycles.controller';
import { MissionCyclesService } from './mission-cycles.service';

@Module({
  imports: [MissionsModule], // MissionCyclesService valide missionId via MissionsService
  controllers: [MissionCyclesController],
  providers: [MissionCyclesService],
  exports: [MissionCyclesService], // TestsService valide mission_cycle_id via findOne()
})
export class MissionCyclesModule {}
