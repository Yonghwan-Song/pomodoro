import { IsNumber } from 'class-validator';

export class UpdateCurrentCycleInfoDto {
  @IsNumber()
  totalFocusDuration: number;

  @IsNumber()
  cycleDuration: number;
}
