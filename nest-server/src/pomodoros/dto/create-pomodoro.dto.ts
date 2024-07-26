import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePomodoroDto {
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
  //TODO: 이것도... post할때는 http request에서 아예 포함 시키는 그런 경우가 발생하지 않지 않나?
  isDummy: boolean; // optional: when it is not specified, this gets false by default.

  // @IsOptional() //! 이거를 이렇게(uncomment) 해버리면 이제...  category는 꼭 존재해야하는 것인데
  //! I think not all sessions should fall into one of the categories.
  //! Users should be allowed to have sessions without categories.
  //! Thus, the category field in the schema should become optional.
  @IsOptional() // <-- for sessions without a category
  @IsString()
  currentCategoryName: string;
}
