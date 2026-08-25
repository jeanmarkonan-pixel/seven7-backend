import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AnomaliesModule } from './anomalies/anomalies.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CabinetsModule } from './cabinets/cabinets.module';
import { ClientsModule } from './clients/clients.module';
import { DocumentsModule } from './documents/documents.module';
import { MissionCyclesModule } from './mission-cycles/mission-cycles.module';
import { MissionsModule } from './missions/missions.module';
import { ReferenceModule } from './reference/reference.module';
import { TestsModule } from './tests/tests.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    PrismaModule,
    AuthModule,
    HealthModule,
    CabinetsModule,
    UsersModule,
    ClientsModule,
    MissionsModule,
    MissionCyclesModule,
    ReferenceModule,
    TestsModule,
    AnomaliesModule,
    DocumentsModule,
  ],
  providers: [
    // Ordre important : le throttler d'abord (limite avant même de tenter
    // l'auth), puis JwtAuthGuard (pose request.user), puis RolesGuard (lit
    // request.user). Global pour que chaque nouveau contrôleur soit protégé
    // par défaut — un handler public doit explicitement le déclarer avec
    // @Public(), pas l'inverse.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
