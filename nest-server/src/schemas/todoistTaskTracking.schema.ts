import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// 언제 사용되는지
// 1. Pomodoro Module에서 create pomodoro할 때
// 2. User Module에서 해당 유저가 가지고 있는 TaskTracking을 가져올 때.
@Schema()
export class TodoistTaskTracking {
  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true }) // 그런데 이거 꼭 있어야 하나?.... duratoin field가 전달 및 기록되지 않는 경우가 존재할 확률은 거의 0 아니야?
  duration: number;
}

export const TodoistTaskTrackingSchema =
  SchemaFactory.createForClass(TodoistTaskTracking);
