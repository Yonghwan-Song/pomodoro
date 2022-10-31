import express from "express";
import {
  createUser,
  deleteUser,
  getPomoSetting,
  updatePomoSetting,
} from "../controllers/users.js";
import middleware from "../middleware/firebase-auth.js";

const router = express.Router();

router.use(middleware.decodeToken);
// all routes in here start with /users

router.get("/:email", getPomoSetting);

// Create a new user
router.post("/", createUser);

// Set a new pomo setting
router.put("/editPomoSetting/:email", updatePomoSetting);

router.delete("/:email", deleteUser);

export default router;
