import express from "express";
import middleware from "../middleware/firebase-auth.js";
import {
  recordPomo,
  getPomoRecords,
  deletePomoRecords,
  generateDummies,
  getStat,
} from "../controllers/pomos.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.get("/:userEmail", getPomoRecords);

router.get("/stat/:userEmail", getStat);

router.post("/", recordPomo);

router.post("/generateDummies/:userEmail", generateDummies);

router.delete("/:userEmail", deletePomoRecords);

export default router;
