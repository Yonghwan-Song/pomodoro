import express from "express";
import middleware from "../middleware/firebase-auth.js";
import {
  removeRecordsBeforeToday,
  getRecordsOfToday,
  storeRecordOfToday,
} from "../controllers/recordOfToday.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.get("/", getRecordsOfToday);

router.post("/", storeRecordOfToday);

router.put("/", removeRecordsBeforeToday);

export default router;
