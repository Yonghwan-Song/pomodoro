import express from "express";
import middleware from "../middleware/firebase-auth.js";
import {
  deleteRecordsBeforeToday,
  getRecordsOfToday,
  storeRecordOfToday,
} from "../controllers/recordOfToday.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.get("/:userEmail", getRecordsOfToday);

router.post("/", storeRecordOfToday);

router.put("/", deleteRecordsBeforeToday);

export default router;
