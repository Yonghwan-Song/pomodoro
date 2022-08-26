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

export const Pomo = mongoose.model("Pomo", pomoSchema);
