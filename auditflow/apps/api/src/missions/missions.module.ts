import { Module } from '@nestjs/common';

import { ClientsModule } from '../clients/clients.module';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';

@Module({
  imports: [ClientsModule], // MissionsService valide client_id via ClientsService
  controllers: [MissionsController],
  providers: [MissionsService],
})
export class MissionsModule {}
