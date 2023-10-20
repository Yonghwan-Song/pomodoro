import express from "express";
import {
  createUser,
  deleteUser,
  getPomoSetting,
  getPomoSettingAndTimersStates,
  updatePomoSetting,
  updateTimersStates,
} from "../controllers/users.js";
import middleware from "../middleware/firebase-auth.js";

const router = express.Router();

router.use(middleware.decodeToken);
// all routes in here start with /users

router.get("/", getPomoSettingAndTimersStates);

// Create a new user
router.post("/", createUser);

// Set a new pomo setting
router.put("/editPomoSetting/", updatePomoSetting);

// Update timersStates
router.put("/updateTimersStates/", updateTimersStates);

router.delete("/", deleteUser);

export default router;
