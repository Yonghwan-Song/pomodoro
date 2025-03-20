import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CycleStat {
  @IsNumber()
  ratio: number;

  @IsNumber()
  cycleAdherenceRate: number;

  @IsNumber()
  start: number;

  @IsNumber()
  end: number;

  @IsDefined()
  @IsNotEmpty()
  date: Date;
}

class PomoSetting {
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

export class CreateCycleSettingDto {
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isCurrent: boolean;

  @IsDefined()
  @ValidateNested()
  @Type(() => PomoSetting)
  pomoSetting: PomoSetting;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CycleStat)
  cycleStat: CycleStat[];
}
