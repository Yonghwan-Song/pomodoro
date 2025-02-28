import { IsNumber, IsOptional } from 'class-validator';

export class UpdateCurrentCycleInfoDto {
  @IsOptional()
  @IsNumber()
  totalFocusDuration?: number;

  @IsOptional()
  @IsNumber()
  cycleDuration?: number;

  @IsOptional()
  @IsNumber()
  cycleStartTimestamp?: number;

  @IsOptional()
  @IsNumber()
  veryFirstCycleStartTimestamp?: number;

  @IsOptional()
  @IsNumber()
  totalDurationOfSetOfCyclesIn?: number;
}
