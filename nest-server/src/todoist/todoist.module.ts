import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TodoistService } from './todoist.service';
import { TodoistController } from './todoist.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [TodoistController],
  providers: [TodoistService],
  exports: [TodoistService],
})
export class TodoistModule {}
