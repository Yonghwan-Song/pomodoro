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

export const getPomoSetting = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.params.email });

    console.log(currentUser.pomoSetting);
    //res.headers.add("Access-Control-Allow-Origin", "*");
    res.send(currentUser.pomoSetting);
  } catch (error) {
    console.log(`getPomoSetting in controllers/users.js\n ${error}`);
  }
};

export const updatePomoSetting = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.params.email });
    currentUser.pomoSetting = req.body.pomoSetting;
    const updatedUser = await currentUser.save();
    res.send(updatedUser);
  } catch (error) {
    console.log(`updatePomoSetting in controllers/users.js\n ${error}`);
  }
};
