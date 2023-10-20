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

router.get("/stat", getStat);

router.post("/", recordPomo);

router.post("/generateDemoData", generateDemoData);

router.delete("/demo", deleteDemoData);

// not used currently
router.get("/", getPomoRecords); // "/stat" is currently used.
router.post("/generateDummies", generateDummies); // "/generateDemoData" is currently used.
router.delete("", deletePomoRecords); // "/demo" is currently used.

export default router;
