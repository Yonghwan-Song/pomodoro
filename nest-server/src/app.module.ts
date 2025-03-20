import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { PomodorosModule } from './pomodoros/pomodoros.module';
import { TodayRecordsModule } from './today-records/today-records.module';
import { FireBase_Admin_Middleware } from './common/middlewares/firebase.middleware';
import { CategoriesModule } from './categories/categories.module';
import { CycleSettingModule } from './cycle-setting/cycle-setting.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DATABASE_URL),
    UsersModule,
    PomodorosModule,
    TodayRecordsModule,
    CategoriesModule,
    CycleSettingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // .apply(FirebaseMiddleware)
      .apply(FireBase_Admin_Middleware)
      .forRoutes(
        'users',
        'pomodoros',
        'today-records',
        'categories',
        'cycle-settings',
      );
  }
}
