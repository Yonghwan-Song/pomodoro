import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TodoistService } from './todoist.service';
import { TodoistController } from './todoist.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { UserSchema } from '@doist/todoist-api-typescript';
import { ConfigModule } from '@nestjs/config';
import {
  TodoistTaskTracking,
  TodoistTaskTrackingSchema,
} from 'src/schemas/todoistTaskTracking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TodoistTaskTracking.name, schema: TodoistTaskTrackingSchema },
    ]),
    ConfigModule.forRoot(),
    HttpModule,
  ],
  controllers: [TodoistController],
  providers: [TodoistService],
})
export class TodoistModule {}
