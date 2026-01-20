import { Router } from "express";
import { presignVideoUpload, presignVideoPlay } from "../controllers/uploadController.js";

const router = Router();

router.post("/video", presignVideoUpload);          // POST /api/uploads/video
router.get("/video/play", presignVideoPlay);        // GET  /api/uploads/video/play?key=...



export default router;
