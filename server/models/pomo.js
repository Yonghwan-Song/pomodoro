import mongoose from "mongoose";
const { Schema } = mongoose;

const pomoSchema = new Schema({
  // userEmail: {
  //   type: Schema.Types.ObjectId,
  //   ref: "User",
  // },
  userEmail: String,
  duration: Number,
  startTime: Number,
});

pomoSchema.statics.findByUserEmail = function (userEmail) {
  return this.find({ userEmail });
};

pomoSchema.statics.deleteAllByUserEmail = function (userEmail) {
  return this.deleteMany({ userEmail });
};

export const Pomo = mongoose.model("Pomo", pomoSchema);
