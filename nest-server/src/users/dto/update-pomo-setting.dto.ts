import { IsNumber } from 'class-validator';

export class UpdatePomoSettingDto {
  @IsNumber()
  pomoDuration: number;

  @IsNumber()
  shortBreakDuration: number;

  @IsNumber()
  longBreakDuration: number;

  @IsNumber()
  numOfPomo: number;
}
