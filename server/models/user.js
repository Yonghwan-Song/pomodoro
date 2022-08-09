import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firebaseUid: String,
    email: String,
    pomoSet: {
      type: [{ type: Schema.Types.ObjectId, ref: "Pomo" }],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
