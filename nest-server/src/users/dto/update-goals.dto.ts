import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
} from 'class-validator';

class GoalDto {
  @IsNumber()
  minimum: number;

  @IsNumber()
  ideal: number;
}

export class UpdateGoalsDto {
  @IsObject()
  @ValidateNested()
  @Type(() => GoalDto)
  weeklyGoal: GoalDto;

  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  dailyGoals: GoalDto[];
}
