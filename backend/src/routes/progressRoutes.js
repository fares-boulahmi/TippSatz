import { Router } from "express";
import {
  completeSession,
  getActivity,
  getLastActivity,
  getSession,
} from "../controllers/progressController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.get("/activity", getActivity);
router.get("/lastActivity", getLastActivity);
router.get("/:collectionId/session", getSession);
router.post("/:collectionId/complete", completeSession);

export default router;
