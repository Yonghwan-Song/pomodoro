import admin from "../firebase/config.js";
import { User } from "../models/user.js";
import { Pomo } from "../models/pomo.js";

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

export const deleteUser = async (req, res) => {
  try {
    let deletedCount = await Pomo.deleteAllByUserEmail(req.params.email);
    let currentUser = await User.findOne({ email: req.params.email });

    let userDeleted = await User.deleteOne({ email: req.params.email });

    console.log({ deletedCount, userDeleted });
    res.send({ deletedCount, userDeleted });
  } catch (error) {
    console.log(error);
    console.log(`******DB error: deleteUser in controllers/users.js******`);
  }
};

export const getPomoSetting = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.params.email });

    if (currentUser) {
      console.log(currentUser.pomoSetting);
      res.send(currentUser.pomoSetting);
    } else {
      res.status(404).send("User is not found");
    }
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
