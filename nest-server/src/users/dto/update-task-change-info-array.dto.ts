import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class TaskChangeInfoDto {
  @IsString()
  id: string;

  @IsNumber()
  @Min(0, { message: 'The value must be a non-negative number' })
  taskChangeTimestamp: number;
}

export class UpdateTaskChangeInfoArrayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChangeInfoDto)
  taskChangeInfoArray: TaskChangeInfoDto[];
}
