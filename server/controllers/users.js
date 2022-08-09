import { User } from "../models/user.js";

/*export const createUser = async (req, res) {
}*/

export const createUser = async (req, res) => {
  try {
    let { firebaseUid, email } = req.body;
    console.log(req.body);
    const newUser = await new User({
      firebaseUid,
      email,
    }).save();
    res.send(newUser);
    console.log(newUser);
  } catch (error) {
    console.log(`******DB error: createUser in controllers/users.js******`);
  }
};
