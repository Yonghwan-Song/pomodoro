import { IsString } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  // @IsNotEmpty()
  name: string;

  // option 1
  // data: Data;

  // option 2
  data:
    | {
        name: string;
      }
    | { color: string }
    | { isCurrent: boolean }
    | { isOnStat: boolean };
}

// class Data {
//   @IsString()
//   @IsOptional()
//   name?: string;

//   @IsString()
//   @IsOptional()
//   color?: string;

//   @IsString()
//   @IsOptional()
//   isCurrent?: boolean;
// }
