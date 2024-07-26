import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/schemas/category.schema';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Pomodoro, PomodoroSchema } from 'src/schemas/pomodoro.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Pomodoro.name, schema: PomodoroSchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
