import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firebaseUid: String,
    email: String,
    pomoSet: {
      type: [{ type: Schema.Types.ObjectId, ref: "Pomo" }],
    },
    pomoSetting: {
      pomoDuration: { type: Number, default: 25 },
      shortBreakDuration: { type: Number, default: 5 },
      longBreakDuration: { type: Number, default: 15 },
      numOfPomo: { type: Number, default: 4 },
    },
    autoStartSetting: {
      doesPomoStartAutomatically: { type: Boolean, default: false },
      doesBreakStartAutomatically: { type: Boolean, default: false },
    },
    timersStates: {
      duration: { type: Number, default: 25 },
      pause: {
        type: {
          totalLength: Number,
          record: [{ start: Number, end: Number }],
        },
        default: { totalLength: 0, record: [] },
      },
      repetitionCount: { type: Number, default: 0 },
      running: { type: Boolean, default: false },
      startTime: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
