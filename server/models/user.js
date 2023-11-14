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
    //TODO: 여기서 이거 이지랄 하면 mongodb는 바뀔텐데, 그러면 api에 약간 이상 생겨서 main 앱 맛 가는거 아니야?
    // 응 좆까, 나말고 아무도 안써.
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
