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

  // Render assigns the service's port through the PORT environment variable.
  // When PORT is not defined (for example, during local development), use 3000.
  // Bind to 0.0.0.0 so the server accepts connections from outside the container.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
