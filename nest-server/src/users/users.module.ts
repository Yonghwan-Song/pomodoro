import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TodoistModule } from 'src/todoist/todoist.module';

@Module({
  imports: [TodoistModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
