import express from "express";
import middleware from "../middleware/firebase-auth.js";
import {
  recordPomo,
  deletePomoRecords,
  deleteDemoData,
  generateDummies,
  generateDemoData,
  getPomoRecords,
  getStat,
} from "../controllers/pomos.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.get("/:userEmail", getPomoRecords);

router.get("/stat/:userEmail&:clientLocationTimezoneOffset", getStat);

router.post("/", recordPomo);

router.post("/generateDummies/:userEmail", generateDummies);

router.post("/generateDemoData/:userEmail", generateDemoData);

router.delete("/:userEmail", deletePomoRecords);

router.delete("/demo/:userEmail", deleteDemoData);

export default router;
