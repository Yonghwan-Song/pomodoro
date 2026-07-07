import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Pomodoro, PomodoroSchema } from 'src/schemas/pomodoro.schema';
import { TodayRecord, TodayRecordSchema } from 'src/schemas/todayRecord.schema';
import { Category, CategorySchema } from 'src/schemas/category.schema';
import {
  CycleSetting,
  CycleSettingSchema,
} from 'src/schemas/cycleSetting.schema';
import {
  TodoistTaskTracking,
  TodoistTaskTrackingSchema,
} from 'src/schemas/todoistTaskTracking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pomodoro.name, schema: PomodoroSchema },
      { name: TodayRecord.name, schema: TodayRecordSchema },
      { name: Category.name, schema: CategorySchema },
      { name: CycleSetting.name, schema: CycleSettingSchema },
      { name: TodoistTaskTracking.name, schema: TodoistTaskTrackingSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
