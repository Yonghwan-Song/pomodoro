import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Category {
  // Instead of this below, I opt in a simple one using `userEmail`
  //* More specifically, I think I will not need to populate user field with User object.
  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  // user: User;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  color: string;

  // If this isCurrent is true, it is the category for the current session.
  @Prop({ required: true, default: false })
  isCurrent: boolean;

  @Prop({ required: true, default: false })
  isOnStat: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ userEmail: 1, name: 1 }, { unique: true });
