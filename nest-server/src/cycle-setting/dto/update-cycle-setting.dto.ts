import {
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCycleSettingDto } from './create-cycle-setting.dto';
import { PartialType } from '@nestjs/mapped-types';

// export class PartialCreateCycleSettingDto extends PartialType(
//   OmitType(CreateCycleSettingDto, ['cycleStat'] as const),
// ) {
//   @ValidateNested({ each: true })
//   @Type(() => CycleStat)
//   cycleStat?: CycleRecord;
// }

export class PartialCreateCycleSettingDto extends PartialType(
  CreateCycleSettingDto,
) {}

//#region New with PartialType
@ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
class AtLeastOnePropertyValidator implements ValidatorConstraintInterface {
  validate(data: PartialCreateCycleSettingDto) {
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

export class UpdateCycleSettingDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Validate(AtLeastOnePropertyValidator)
  @Type(() => PartialCreateCycleSettingDto)
  data: PartialCreateCycleSettingDto;
}
//#endregion

//#region Original
// @ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
// class AtLeastOnePropertyValidator implements ValidatorConstraintInterface {
//   validate(data: CreateCycleSettingDto) {
//     if (!data || typeof data !== 'object' || data === null) {
//       return false;
//     }

//     return (
//       Object.keys(data).length > 0 &&
//       Object.values(data).some((value) => value !== undefined)
//     );
//   }

//   defaultMessage() {
//     return 'data object must contain at least one property';
//   }
// }

// export class UpdateCycleSettingDto {
//   @IsString()
//   name: string;

//   @ValidateNested()
//   @Validate(AtLeastOnePropertyValidator)
//   @Type(() => CreateCycleSettingDto)
//   data: CreateCycleSettingDto;
// }
//#endregion
