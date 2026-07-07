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

class TaskTracking {
  @IsNotEmpty()
  @IsString()
  taskId: string;
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
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

  // @IsOptional()
  // @IsString()
  // taskId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => Task)
  task?: Task; // 어차피 Pomodoro schema에서 taskId가 field이고, F.E에서 우리가 알고있는 정보도 그냥 taskId가 유일한데 뭐하러 이렇게 object를 하나 더 define해서 복잡하게 할 필요가 있는거야?
}

export class CreatePomodoroDto {
  @ValidateNested({ each: true }) // Each object in the pomodoroRecordArr array, which is nested, is validated individually.
  @Type(() => PomodoroRecord)
  pomodoroRecordArr: PomodoroRecord[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaskTracking)
  taskTrackingArr: TaskTracking[];
}
