import { Module } from '@nestjs/common';

import { CabinetsController } from './cabinets.controller';
import { CabinetsService } from './cabinets.service';

@Module({
  controllers: [CabinetsController],
  providers: [CabinetsService],
})
export class CabinetsModule {}
