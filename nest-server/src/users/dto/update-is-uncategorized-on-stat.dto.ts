import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateIsUnCategorizedOnStatDto {
  @IsNotEmpty()
  @IsBoolean()
  isUnCategorizedOnStat: boolean;
}
