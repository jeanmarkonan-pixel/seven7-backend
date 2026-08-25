import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Les en-têtes du plan de conformité (§4.4) : HSTS, nosniff, frame-ancestors.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // whitelist + forbidNonWhitelisted ferment la porte au mass assignment (§4.3).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('AUDITFLOW API')
    .setDescription("API de la suite d'audit externe zone OHADA")
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`AUDITFLOW API à l'écoute sur http://localhost:${port}/api`);
}

void bootstrap();
