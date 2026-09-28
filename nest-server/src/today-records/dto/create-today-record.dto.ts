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
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

//#region from pomodoro dto
class Category {
  @IsString()
  name: string;
}

class TaskTracking {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;
}

class Task {
  @IsNotEmpty()
  @IsString()
  id: string;
}

class PomodoroRecord {
  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsNumber()
  startTime: number;

  @IsString()
  date: string;

  @IsOptional()
  @IsBoolean()
  isDummy: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => Category)
  category?: Category;

  @IsOptional()
  @ValidateNested()
  @Type(() => Task)
  task?: Task;
}
//#endregion

//#region timer_session_record
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
//#endregion

export class CreateTodayRecordDto {
  // 새롭게 합쳐지는 부분
  //#region When Kind is pomo
  @IsOptional() // NOTE: kind === "pomo"인 경우에만 받는다.
  @ValidateNested({ each: true }) // Each object in the pomodoroRecordArr array, which is nested, is validated individually.
  @Type(() => PomodoroRecord)
  pomodoroRecordArr: PomodoroRecord[];

  @IsOptional() // NOTE: kind === "pomo"이고, 사용자가 todoist task를 선택해서 진행한 경우.
  @ValidateNested({ each: true })
  @Type(() => TaskTracking)
  taskTrackingArr: TaskTracking[];
  //#endregion

  // 기존
  @IsIn(['pomo', 'break'])
  kind: 'pomo' | 'break';

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
