// payload
// {
//   "userEmail": "yhs.p.user@gmail.com",
//   "kind": "pomo",
//   "startTime": 1715778724810,
//   "pause": {
//     "totalLength": 0,
//     "record": []
//   },
//   "endTime": 1715778784810,
//   "timeCountedDown": 60000
// }

import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RecordDto {
  @IsOptional()
  start: number;

  @IsOptional()
  end: number;
}

class PauseDto {
  totalLength: number;

  @ValidateNested({ each: true })
  @Type(() => RecordDto)
  record: RecordDto[];
}

export class CreateTodayRecordDto {
  //TODO:  dto string -> ""? is this going to pass validation? or should I add @IsNotEmpty()
  @IsString()
  kind: string;

  @IsNumber()
  @IsPositive()
  startTime: number;

  @ValidateNested()
  @Type(() => PauseDto)
  pause: PauseDto; //TODO: 이거는 사실 optional로 해도 되긴 한데, FE쪽에서 그냥 default값을 보내온다. 어떻게 할지 고민해보기.

  @IsNumber()
  @IsPositive()
  endTime: number;

  @IsNumber()
  @IsPositive() //TODO: 이거 positive가 아닌 case가 있을까?....
  timeCountedDown: number;
}
