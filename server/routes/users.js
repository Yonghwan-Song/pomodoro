import express from "express";
import { createUser } from "../controllers/users.js";
import middleware from "../middleware/firebase-auth.js";

const router = express.Router();

router.use(middleware.decodeToken);
// all routes in here start with /users

router.get("/", (req, res) => {
  console.log(users);
  res.send(users);
});

// Create a new user
router.post("/", createUser);

export default router;
