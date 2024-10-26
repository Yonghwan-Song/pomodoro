import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class Category {
  @IsNotEmpty()
  @IsString()
  name: string;
}
class PomodoroRecord {
  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  startTime: number;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isDummy: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => Category)
  category?: Category;
}
export class CreatePomodoroDto {
  @ValidateNested({ each: true }) // Each object in the pomodoroRecordArr array, which is nested, is validated individually.
  @Type(() => PomodoroRecord)
  pomodoroRecordArr: PomodoroRecord[];
}

//#region Original
// export class CreatePomodoroDto {
//   @IsNotEmpty()
//   @IsNumber()
//   duration: number;

//   @IsNotEmpty()
//   @IsNumber()
//   @IsPositive()
//   startTime: number;

//   @IsNotEmpty()
//   @IsString()
//   date: string;

//   @IsOptional()
//   @IsBoolean()
//   //TODO: 이것도... post할때는 http request에서 아예 포함 시키는 그런 경우가 발생하지 않지 않나?
//   isDummy: boolean; // optional: when it is not specified, this gets false by default.

//   // @IsOptional() //! 이거를 이렇게(uncomment) 해버리면 이제...  category는 꼭 존재해야하는 것인데
//   //! I think not all sessions should fall into one of the categories.
//   //! Users should be allowed to have sessions without categories.
//   //! Thus, the category field in the schema should become optional.
//   @IsOptional() // <-- for sessions without a category
//   @IsString()
//   currentCategoryName?: string; // 서버쪽에서는 currentCategory가 의미가 없으니까 이렇게 바꿔도 괜찮다.
//   // 만약 이게 없고 저 아래 array만 있으면, startingCategory는 uncategorized이다. :::...

//   @IsOptional()
//   @IsArray()
//   categoryChangeInfoArray?: {
//     categoryName: string;
//     categoryChangeTimestamp: number;
//   }[];

//   @IsOptional()
//   sessionData?: {
//     startTime: number;
//     pause: {
//       totalLength: number;
//       record: { start: number; end: number | undefined }[];
//     };
//     endTime: number;
//     timeCountedDown: number;
//   };
// }
//#endregion
