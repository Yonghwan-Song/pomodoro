import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePomodoroDto {
  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  startTime: number;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isDummy: boolean; // optional: when it is not specified, this gets false by default.
}
