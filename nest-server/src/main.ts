import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: ConfigService = app.get(ConfigService);
  const adminConfig: ServiceAccount = {
    projectId: 'pomodoro-ef5e0',
    privateKey: configService.get<string>('FIREBASE_ADMIN_PRIVATE_KEY'),
    clientEmail: configService.get<string>('FIREBASE_ADMIN_CLIENT_EMAIL'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
  });

  app.enableCors();

  await app.listen(3000);
}
bootstrap();
