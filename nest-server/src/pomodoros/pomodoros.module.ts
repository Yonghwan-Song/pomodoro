import { Module } from '@nestjs/common';
import { PomodorosService } from './pomodoros.service';
import { PomodorosController } from './pomodoros.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Pomodoro, PomodoroSchema } from 'src/schemas/pomodoro.schema';
import { Category, CategorySchema } from 'src/schemas/category.schema';
import {
  TodoistTaskTracking,
  TodoistTaskTrackingSchema,
} from 'src/schemas/todoistTaskTracking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pomodoro.name, schema: PomodoroSchema },
      { name: Category.name, schema: CategorySchema },
      { name: TodoistTaskTracking.name, schema: TodoistTaskTrackingSchema },
    ]),
  ],
  controllers: [PomodorosController],
  providers: [PomodorosService],
})
export class PomodorosModule {}
