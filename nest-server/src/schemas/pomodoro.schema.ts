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
}

export const PomodoroSchema = SchemaFactory.createForClass(Pomodoro);
