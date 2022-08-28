import express from "express";
import middleware from "../middleware/firebase-auth.js";
import {
  recordPomo,
  getPomoRecords,
  deletePomoRecords,
  generateDummies,
} from "../controllers/pomos.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.get("/:userEmail", getPomoRecords);

router.post("/", recordPomo);

router.post("/generateDummies", generateDummies);

router.delete("/:userEmail", deletePomoRecords);

export default router;
