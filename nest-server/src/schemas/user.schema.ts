import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';

interface PomoSetting {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
}

interface AutoStartSetting {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
}

interface TimersStates {
  duration: number;
  pause: {
    totalLength: number;
    record: [{ start: number; end: number }];
  };
  repetitionCount: number;
  running: boolean;
  startTime: number;
}

@Schema()
export class User {
  @Prop()
  firebaseUid: string; // TODO: 이거 password처럼 생각해야하는거 아닌가 싶은데 흠..

  @Prop()
  userEmail: string;

  @Prop(
    raw({
      pomoDuration: { type: Number, default: 25 },
      shortBreakDuration: { type: Number, default: 5 },
      longBreakDuration: { type: Number, default: 15 },
      numOfPomo: { type: Number, default: 4 },
    }),
  )
  pomoSetting: PomoSetting;

  @Prop(
    raw({
      doesPomoStartAutomatically: { type: Boolean, default: false },
      doesBreakStartAutomatically: { type: Boolean, default: false },
    }),
  )
  autoStartSetting: AutoStartSetting;

  @Prop(
    raw({
      duration: { type: Number, default: 25 },
      pause: {
        type: {
          totalLength: Number,
          record: [{ start: Number, end: Number }], // All fields in a mongoose schema are optional by default
        },
        default: { totalLength: 0, record: [] },
      },
      repetitionCount: { type: Number, default: 0 },
      running: { type: Boolean, default: false },
      startTime: { type: Number, default: 0 },
    }),
  )
  timersStates: TimersStates;
}

export const UserSchema = SchemaFactory.createForClass(User);
