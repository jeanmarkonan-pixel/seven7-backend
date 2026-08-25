import { Module } from '@nestjs/common';

import { RapportsModule } from '../rapports/rapports.module';
import { RevuesQualiteController } from './revues-qualite.controller';
import { RevuesQualiteService } from './revues-qualite.service';

@Module({
  imports: [RapportsModule],
  controllers: [RevuesQualiteController],
  providers: [RevuesQualiteService],
})
export class RevuesQualiteModule {}
