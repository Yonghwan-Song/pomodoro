import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { PomodorosModule } from './pomodoros/pomodoros.module';
import { TodayRecordsModule } from './today-records/today-records.module';
import { FireBase_Admin_Middleware } from './common/middlewares/firebase.middleware';
import { CategoriesModule } from './categories/categories.module';
import { CycleSettingModule } from './cycle-setting/cycle-setting.module';
import { TodoistModule } from './todoist/todoist.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    // MongooseModule.forRoot(process.env.DATABASE_URL),
    UsersModule,
    PomodorosModule,
    TodayRecordsModule,
    CategoriesModule,
    CycleSettingModule,
    TodoistModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FireBase_Admin_Middleware)
      .exclude({ path: 'todoist/oauth/callback', method: RequestMethod.GET })
      .forRoutes(
        'users',
        'pomodoros',
        'today-records',
        'categories',
        'cycle-settings',
        'todoist',
      );
  }
}
