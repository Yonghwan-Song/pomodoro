import { IsNumber, IsPositive } from 'class-validator';

export class CreateDemoDataDto {
  @IsNumber()
  @IsPositive()
  timestampForBeginningOfYesterday: number;

  @IsNumber()
  timezoneOffset: number;
}
