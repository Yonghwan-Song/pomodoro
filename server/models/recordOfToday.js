import mongoose from "mongoose";
const { Schema } = mongoose;

const recordOfTodaySchema = new Schema({
  userEmail: String,
  kind: String,
  startTime: Number,
  endTime: Number,
  timeCountedDown: Number,
  pause: {
    type: {
      totalLength: Number,
      record: [{ start: Number, end: Number }],
    },
  },
});

recordOfTodaySchema.statics.findByUserEmail = function (userEmail) {
  return this.find({ userEmail });
};

export const RecordOfToday = mongoose.model("todayRecord", recordOfTodaySchema);
