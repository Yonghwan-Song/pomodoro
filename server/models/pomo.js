import mongoose from "mongoose";
const { Schema } = mongoose;

// If a duration starts 11:30pm and ends 12:30am,
// the date for this is calculated based on 11:30pm
// which is the start time.
const pomoSchema = new Schema({
  // userEmail: {
  //   type: Schema.Types.ObjectId,
  //   ref: "User",
  // },
  userEmail: String,
  duration: Number,
  startTime: { type: Number, unique: true },
  date: String,
  isDummy: { type: Boolean, default: false },
});

pomoSchema.statics.findByUserEmail = function (userEmail) {
  return this.find({ userEmail });
};

pomoSchema.statics.deleteAllByUserEmail = function (userEmail) {
  return this.deleteMany({ userEmail });
};

export const Pomo = mongoose.model("Pomo", pomoSchema);
