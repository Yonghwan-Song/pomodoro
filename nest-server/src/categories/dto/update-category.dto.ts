import {
  IsString,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

//#region Original
// export class UpdateCategoryDto {
//   @IsString()
//   // @IsNotEmpty()
//   name: string;

//   // option 1
//   // data: Data;

//   // option 2
//   // data:
//   //   | {
//   //       name: string;
//   //     }
//   //   | { color: string }
//   //   | { isCurrent: boolean }
//   //   | { isOnStat: boolean };
//   data: {
//     name?: string;
//     color?: string;
//     isCurrent?: boolean;
//     isOnStat?: boolean;
//   };
// }
//#endregion

class CategoryData {
  @IsString()
  name?: string;

  @IsString()
  color?: string;

  isCurrent?: boolean;

  isOnStat?: boolean;
}

@ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
class AtLeastOnePropertyValidator implements ValidatorConstraintInterface {
  validate(data: CategoryData) {
    if (!data || typeof data !== 'object') {
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

export class UpdateCategoryDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Validate(AtLeastOnePropertyValidator)
  @Type(() => CategoryData)
  data: CategoryData;
}
