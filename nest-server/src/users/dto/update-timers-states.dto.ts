import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RecordDto {
  @IsOptional()
  start: number;

  @IsOptional()
  end?: number;

  @IsOptional()
  reason?: string | null;
}

// QQQ: 왜 둘다 optional이지?
class PauseDto {
  @IsOptional()
  totalLength: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordDto)
  record: RecordDto[];
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
