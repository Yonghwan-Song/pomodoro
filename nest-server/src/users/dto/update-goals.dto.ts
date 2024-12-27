import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, ValidateNested } from 'class-validator';

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
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  dailyGoals: GoalDto[];
}
