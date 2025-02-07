import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';
// import { Category } from 'src/schemas/category.schema';

interface PomoSetting {
  pomoDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  numOfPomo: number;
  numOfCycle: number;
}

interface AutoStartSetting {
  doesPomoStartAutomatically: boolean;
  doesBreakStartAutomatically: boolean;
  doesCycleStartAutomatically: boolean;
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

interface Goal {
  minimum: number;
  ideal: number;
}

type DailyGoals = [Goal, Goal, Goal, Goal, Goal, Goal, Goal];

interface Goals {
  weeklyGoal: Goal;
  dailyGoals: DailyGoals;
}

@Schema()
export class User {
  @Prop({ unique: true })
  firebaseUid: string; // TODO: 이거 password처럼 생각해야하는거 아닌가 싶은데 흠..

  @Prop({ unique: true })
  userEmail: string;

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

  @Prop(
    raw({
      doesPomoStartAutomatically: { type: Boolean, default: false },
      doesBreakStartAutomatically: { type: Boolean, default: false },
      doesCycleStartAutomatically: { type: Boolean, default: false },
    }),
  )
  autoStartSetting: AutoStartSetting;

  @Prop(
    raw({
      weeklyGoal: {
        type: { minimum: Number, ideal: Number },
        default: { minimum: 30, ideal: 40 },
      },
      dailyGoals: {
        type: [{ minimum: Number, ideal: Number }],
        default: [
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
          { minimum: 4, ideal: 6 },
        ],
      },
    }),
  )
  goals: Goals;

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

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }] })
  categories: ObjectId[];
  // categories: Category[];

  @Prop({ default: true })
  isUnCategorizedOnStat: boolean;

  @Prop({ default: '#f04005' })
  colorForUnCategorized: string;

  @Prop(
    raw({
      type: [
        {
          categoryName: String,
          categoryChangeTimestamp: Number,
          color: String,
          progress: { type: Number, default: 0 },
        },
      ],
      default: [
        {
          categoryName: 'uncategorized',
          categoryChangeTimestamp: 0,
          color: '#f04005',
          progress: 0,
        },
      ],
    }),
  )
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
    color: string;
    progress: number;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
