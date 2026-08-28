import { Module } from '@nestjs/common';
import { PomodorosService } from './pomodoros.service';
import { PomodorosController } from './pomodoros.controller';

@Module({
  controllers: [PomodorosController],
  providers: [PomodorosService],
})
export class PomodorosModule {}
