import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RecordDto {
  @IsOptional()
  start: number;

  @IsOptional()
  end: number;
}

class PauseDto {
  totalLength: number;

  @ValidateNested()
  @Type(() => RecordDto)
  record: RecordDto;
}

export class UpdateTimersStatesDto {
  @IsOptional()
  duration: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PauseDto)
  pause: PauseDto;

  @IsOptional()
  repetitionCount: number;

  @IsOptional()
  running: boolean;

  @IsOptional()
  startTime: number;
}
