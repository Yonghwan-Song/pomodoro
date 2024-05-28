import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';

interface Pause {
  pause: {
    totalLength: number;
    record: [{ start: number; end: number }];
  };
}

@Schema()
export class TodayRecord {
  @Prop({ required: true })
  userEmail: string;

  @Prop()
  kind: 'pomo' | 'break';

  @Prop()
  startTime: number;

  @Prop()
  endTime: number;

  @Prop()
  timeCountedDown: number;

  @Prop(
    raw({
      type: {
        totalLength: Number,
        record: [{ start: Number, end: Number }],
      },
      default: { totalLength: 0, record: [] },
    }),
  )
  pause: Pause;
}

export const TodayRecordSchema = SchemaFactory.createForClass(TodayRecord);
