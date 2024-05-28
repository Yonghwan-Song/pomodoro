import { Module } from '@nestjs/common';
import { PomodorosService } from './pomodoros.service';
import { PomodorosController } from './pomodoros.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Pomodoro, PomodoroSchema } from 'src/schemas/pomodoro.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pomodoro.name, schema: PomodoroSchema },
    ]),
  ],
  controllers: [PomodorosController],
  providers: [PomodorosService],
})
export class PomodorosModule {}
