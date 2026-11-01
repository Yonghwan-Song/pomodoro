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
  IsArray,
  IsInt,
  Min,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
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

  @IsOptional()
  @IsString()
  reason?: string | null;
}

class PauseDto {
  totalLength: number;

  @ValidateNested({ each: true })
  @Type(() => RecordDto)
  record: RecordDto[];
}

// Client SessionSegment. owner is [categoryName, taskId]. type is focus or pause.
class SessionSegmentDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  owner: [string, string];

  @IsInt()
  @Min(0)
  duration: number;

  @IsIn(['focus', 'pause'])
  type: 'focus' | 'pause';

  @IsInt()
  @IsPositive()
  startTime: number;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
//#endregion

export class CreateTodayRecordDto {
  // 새롭게 합쳐지는 부분
  @IsOptional() // NOTE: kind === "pomo"인 경우에만 받는다.
  @ValidateNested({ each: true }) // Each object in the pomodoroRecordArr array, which is nested, is validated individually.
  @Type(() => PomodoroRecord)
  pomodoroRecordArr: PomodoroRecord[];

  @IsOptional() // NOTE: kind === "pomo"이고, 사용자가 todoist task를 선택해서 진행한 경우.
  @ValidateNested({ each: true })
  @Type(() => TaskTracking)
  taskTrackingArr: TaskTracking[];

  // pomo와 break 모두 보낸다.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionSegmentDto)
  segments: SessionSegmentDto[];

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

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedDuration?: number;

  @IsOptional()
  @IsInt()
  editedDuration?: number;

  @IsOptional()
  @IsBoolean()
  isEarlyEnded?: boolean;

  @IsOptional()
  @IsString()
  earlyEndReason?: string | null;
}
