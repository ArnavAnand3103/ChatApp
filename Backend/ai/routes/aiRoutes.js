import express from "express";
import { chatWithAI, generateImage, codeAssist, summarizeChatController, chatRAGController, documentRAGController, semanticSearchController, generateStickerController, editImageController, extractTasksController, multiAgentController } from "../controllers/aiController.js";
import { verifyToken } from "../../middelware/auth.js";

const router = express.Router();

// ── Existing routes (do not remove) ──────────────────────────────
router.post("/chat", verifyToken, chatWithAI);
router.post("/image", verifyToken, generateImage);
router.post("/code", verifyToken, codeAssist);

// ── New AI feature routes ─────────────────────────────────────────
router.post("/summarize", verifyToken, summarizeChatController);
router.post("/rag", verifyToken, chatRAGController);
router.post("/doc-rag", verifyToken, documentRAGController);
router.post("/semantic-search", verifyToken, semanticSearchController);
router.post("/sticker", verifyToken, generateStickerController);
router.post("/edit-image", verifyToken, editImageController);
router.post("/extract-tasks", verifyToken, extractTasksController);
router.post("/multi-agent", verifyToken, multiAgentController);


export default router;