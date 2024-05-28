import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { PomodorosModule } from './pomodoros/pomodoros.module';
import { TodayRecordsModule } from './today-record/today-records.module';
import { FireBase_Admin_Middleware } from './common/middlewares/firebase.middleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DATABASE_URL),
    UsersModule,
    PomodorosModule,
    TodayRecordsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // .apply(FirebaseMiddleware)
      .apply(FireBase_Admin_Middleware)
      .forRoutes('users', 'pomodoros', 'today-records');
  }
}
