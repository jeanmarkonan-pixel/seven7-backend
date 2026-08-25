import { Module } from '@nestjs/common';

import { MissionCyclesModule } from '../mission-cycles/mission-cycles.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [MissionCyclesModule], // TestsService valide mission_cycle_id via cette classe
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
