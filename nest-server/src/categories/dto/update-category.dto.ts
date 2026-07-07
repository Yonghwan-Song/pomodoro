import {
  IsString,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryData {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnStat?: boolean;
}

@ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
class AtLeastOnePropertyValidator implements ValidatorConstraintInterface {
  validate(data: CategoryData) {
    if (!data || typeof data !== 'object' || data === null) {
      return false;
    }

    return (
      Object.keys(data).length > 0 &&
      Object.values(data).some((value) => value !== undefined)
    );
  }

  defaultMessage() {
    return 'data object must contain at least one property';
  }
}

// Single category update DTO
export class UpdateCategoryDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Validate(AtLeastOnePropertyValidator)
  @Type(() => CategoryData)
  data: CategoryData;
}

// New batch update DTO
export class BatchUpdateCategoryDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one category update is required' })
  @ValidateNested({ each: true })
  @Type(() => UpdateCategoryDto)
  categories: UpdateCategoryDto[];
}
