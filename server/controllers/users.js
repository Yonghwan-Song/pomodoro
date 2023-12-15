import admin from "../firebase/config.js";
import { User } from "../models/user.js";
import { Pomo } from "../models/pomo.js";
import { RecordOfToday } from "../models/recordOfToday.js";

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
    let deletedPomosCount = await Pomo.deleteAllByUserEmail(req.userEmail);
    let deletedRecordscount = await RecordOfToday.deleteAllByUserEmail(
      req.userEmail
    );
    let userDeleted = await User.deleteOne({ email: req.userEmail });

    const whatIsDeleted = {
      deletedPomosCount,
      deletedRecordscount,
      userDeleted,
    };

    console.log(whatIsDeleted);
    res.send(whatIsDeleted);
  } catch (error) {
    console.log(error);
    console.log(`******DB error: deleteUser in controllers/users.js******`);
  }
};

//#region deprecated.
// export const getPomoSetting = async (req, res) => {
//   try {
//     let currentUser = await User.findOne({ email: req.userEmail });

//     if (currentUser) {
//       console.log(currentUser.pomoSetting);
//       res.send(currentUser.pomoSetting);
//     } else {
//       res.status(404).send("User is not found");
//     }
//   } catch (error) {
//     console.log(`getPomoSetting in controllers/users.js\n ${error}`);
//   }
// };

// export const getPomoSettingAndTimersStates = async (req, res) => {
//   try {
//     let currentUser = await User.findOne({ email: req.userEmail });

//     if (currentUser) {
//       console.log("current user", currentUser);
//       res.send({
//         pomoSetting: currentUser.pomoSetting,
//         timersStates: currentUser.timersStates,
//       });
//     } else {
//       res.status(404).send("User is not found");
//     }
//   } catch (error) {
//     console.log(
//       `getPomoSettingAndTimersStates in controllers/users.js\n ${error}`
//     );
//   }
// };
//#endregion

export const getUserInfoRelatedToRunningTimer = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.userEmail });
    if (currentUser) {
      console.log("current user", currentUser);
      res.send({
        pomoSetting: currentUser.pomoSetting,
        timersStates: currentUser.timersStates,
        autoStartSetting: currentUser.autoStartSetting,
      });
    } else {
      res.status(404).send("User is not found");
    }
  } catch (error) {
    console.log(
      `getUserInfoRelatedToRunningTimer  in controllers/users.js\n ${error}`
    );
  }
};

export const updatePomoSetting = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.userEmail });
    if (currentUser) {
      currentUser.pomoSetting = req.body.pomoSetting;
      const updatedUser = await currentUser.save();
      res.send(updatedUser);
    } else {
      res.status(404).send("User is not found");
    }
  } catch (error) {
    console.log(
      "---------------------ERROR (UpdatePomoSetting In controllers/users.js)---------------------"
    );
    console.log(error);
  }
};

export const updateTimersStates = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.userEmail });
    console.log("timersState in req", req.body.states);
    if (currentUser) {
      for (const key in req.body.states) {
        currentUser.timersStates[key] = req.body.states[key];
      }

      const updatedUser = await currentUser.save();
      console.log(
        `After timersState is updated at ${Date.now()}`,
        updatedUser.timersStates
      );
      res.send(updatedUser);
    } else {
      res.status(404).send("User is not found");
    }
  } catch (error) {
    console.log(
      "---------------------ERROR (UpdateTimersStates In controllers/users.js)---------------------"
    );
    console.log(error);
  }
};

export const updateAutoStartSetting = async (req, res) => {
  try {
    let currentUser = await User.findOne({ email: req.userEmail });
    console.log("req.body in updateAutoStartSetting", req.body);
    if (currentUser) {
      currentUser.autoStartSetting = {
        ...currentUser.autoStartSetting,
        ...req.body.autoStartSetting,
      };
      const updatedUser = await currentUser.save();
      res.send(updatedUser);
    } else {
      res.status(404).send("User is not found");
    }
  } catch (error) {
    console.log(
      "---------------------ERROR (UpdateAutoStartSetting In controllers/users.js)---------------------"
    );
    console.log(error);
  }
};
