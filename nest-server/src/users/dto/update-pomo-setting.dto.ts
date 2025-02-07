import { IsNumber, Min, Max } from 'class-validator';

export class UpdatePomoSettingDto {
  @IsNumber()
  @Min(1)
  @Max(1000)
  pomoDuration: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  shortBreakDuration: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  longBreakDuration: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  numOfPomo: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  numOfCycle: number;
}
