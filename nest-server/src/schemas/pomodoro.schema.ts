import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';

@Schema()
export class Pomodoro {
  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  duration: number;

  // @Prop({ unique: true, required: true })// 한 유저에 한해서 유일해야 하는데
  @Prop({ required: true })
  startTime: number;

  @Prop({ required: true })
  date: string;

  @Prop({ default: false })
  isDummy: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  category?: ObjectId;

  @Prop()
  taskId?: string; //! 우선 이렇게 unique id를 field로 해놔서 활용가능성은 남겨둬야겠다.
  //! 1. 대신에 실제 얼마나 했는지를 UI 옆에 나태내야 하기 때문에, controller & provider에서 딱딱 바로바로 계산을 해서.
  //! 2. taskId와 durationSpentOn이라는 fields를 갖는 interface를 만들어서, MongoDB에 저장하고
  //! 3. {taskId: string, durationSpentOn: number}[]의 taskId와 매치되는 todoistTask document를 구하고
  //? 4. FE로 불러왔을 때, durationSpent을 `Tasks UI`에 그려넣는다.
}

export const PomodoroSchema = SchemaFactory.createForClass(Pomodoro);

// 뭔가 미묘하게 맛 가게 하는 듯 constructor관련해서.
// export const PomodoroSchema = Pomodoro.schema;
//   static schema = SchemaFactory.createForClass(Pomodoro).index(
//     { userEmail: 1, startTime: 1 },
//     { unique: true },
//   );
