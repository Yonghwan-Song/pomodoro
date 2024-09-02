import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CategoryChangeInfoDto {
  @IsString()
  categoryName: string;

  @IsNumber()
  @Min(0, { message: 'The value must be a non-negative number' })
  categoryChangeTimestamp: number;

  @IsString()
  color: string;

  @IsNumber()
  @Min(0, { message: 'The value must be a non-negative number' })
  progress: number;
}

export class UpdateCategoryChangeInfoArrayDto {
  @IsArray()
  @ValidateNested({ each: true }) // Validate each item in the array
  @Type(() => CategoryChangeInfoDto) // Ensure the array items are treated as `CategoryChangeInfoDto` objects
  categoryChangeInfoArray: CategoryChangeInfoDto[];
}
