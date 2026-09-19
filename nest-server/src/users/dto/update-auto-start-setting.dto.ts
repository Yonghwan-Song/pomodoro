import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAutoStartSettingDto {
  @IsBoolean()
  @IsOptional()
  doesPomoStartAutomatically?: boolean;

  @IsBoolean()
  @IsOptional()
  doesBreakStartAutomatically?: boolean;

  @IsBoolean()
  @IsOptional()
  doesCycleStartAutomatically?: boolean;
}
