import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateColorForUnCategorizedDto {
  @IsNotEmpty()
  @IsString()
  colorForUnCategorized: string;
}
