import { Module } from '@nestjs/common';

import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailService } from './audit-trail.service';

@Module({
  controllers: [AuditTrailController],
  providers: [AuditTrailService],
})
export class AuditTrailModule {}
