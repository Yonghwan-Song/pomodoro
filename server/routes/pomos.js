import express from "express";
import middleware from "../middleware/firebase-auth.js";
import { recordPomo } from "../controllers/pomos.js";

const router = express.Router();

router.use(middleware.decodeToken);

router.post("/", recordPomo);

export default router;
