import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateCurrentTaskIdAndTaskChangeInfoArrayDto {
  @IsString()
  currentTaskId: string;

  @IsBoolean()
  @IsOptional()
  doesItJustChangeTask?: boolean;

  // 여태까지 한거 record하는 경우에는 이게 필요함.
  @IsNumber()
  @IsOptional()
  changeTimestamp?: number;
}
