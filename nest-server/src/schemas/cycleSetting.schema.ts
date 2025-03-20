import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface PomoSetting {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  numOfCycle: number;
}
export interface AutoStartSetting {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
  doesCycleStartAutomatically: boolean;
}

export type CycleRecord = {
  ratio: number;
  cycleAdherenceRate: number;
  start: number;
  end: number;
  date: Date;
};

@Schema({ timestamps: true })
export class CycleSetting extends Document {
  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  name: string; //? 이거 필요하냐....

  @Prop({ default: false })
  isCurrent: boolean;

  @Prop(
    raw({
      pomoDuration: { type: Number, default: 25, min: 1, max: 1000 },
      shortBreakDuration: { type: Number, default: 5, min: 1, max: 1000 },
      longBreakDuration: { type: Number, default: 15, min: 1, max: 1000 },
      numOfPomo: { type: Number, default: 4, min: 1, max: 100 },
      numOfCycle: { type: Number, default: 1, min: 1, max: 100 },
    }),
  )
  pomoSetting: PomoSetting;

  @Prop({ type: Array, default: [] })
  cycleStat: [CycleRecord];

  @Prop({ type: Number, default: 1 })
  averageAdherenceRate: number;
}

export const CycleSettingSchema = SchemaFactory.createForClass(CycleSetting);

// Add the compound index to enforce uniqueness on userEmail and name
CycleSettingSchema.index({ userEmail: 1, name: 1 }, { unique: true });
