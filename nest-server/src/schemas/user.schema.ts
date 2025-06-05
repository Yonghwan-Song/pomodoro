import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { ObjectId } from 'mongoose';

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

interface CycleInfo {
  totalFocusDuration: number;
  cycleDuration: number;
  cycleStartTimestamp: number;
  veryFirstCycleStartTimestamp: number;
  totalDurationOfSetOfCycles: number;
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

  @Prop({ type: String, default: null, required: false })
  todoistAccessToken: string | null;

  @Prop({ type: Boolean, default: false })
  isTodoistIntegrationEnabled: boolean;

  @Prop(
    raw({
      type: [{ id: String, taskChangeTimestamp: Number }],
      default: [],
    }),
  )
  taskChangeInfoArray: {
    id: string;
    taskChangeTimestamp: number;
  }[];

  @Prop({ type: String, default: '', required: false })
  currentTaskId: string;

  @Prop({ unique: true })
  userEmail: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CycleSetting' }],
  })
  cycleSettings: ObjectId[];

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

  @Prop(
    raw({
      totalFocusDuration: { type: Number, default: 100 * 60 },
      cycleDuration: { type: Number, default: 130 * 60 },
      cycleStartTimestamp: { type: Number, default: 0 },
      veryFirstCycleStartTimestamp: { type: Number, default: 0 },
      totalDurationOfSetOfCycles: { type: Number, default: 130 * 60 }, // because the default value of numOfCycle is one.
    }),
  )
  currentCycleInfo: CycleInfo;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }] })
  categories: ObjectId[];

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
