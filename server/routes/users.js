import express from "express";
import {
  createUser,
  deleteUser,
  getUserInfoRelatedToRunningTimer,
  updateAutoStartSetting,
  updatePomoSetting,
  updateTimersStates,
} from "../controllers/users.js";
import middleware from "../middleware/firebase-auth.js";

const router = express.Router();

router.use(middleware.decodeToken);
//! all routes in here start with /users

router.get("/", getUserInfoRelatedToRunningTimer);

// Create a new user
router.post("/", createUser);

// Set a new pomo setting
router.put("/editPomoSetting", updatePomoSetting);

// Update timersStates
router.put("/updateTimersStates", updateTimersStates);

// Update autoStartSetting
router.put("/updateAutoStartSetting", updateAutoStartSetting);

router.delete("/", deleteUser);

export default router;
