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
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
