import express from "express";
import {
    chatWithAI,
    getAIHistory,
    generateImage,
    editImage,
    uploadDocumentRAG,
    askDocumentRAG,
    getDocumentStatus,
    clearDocumentIndex,
    chatRAG,
    semanticSearch,
    extractTasks
} from "../controllers/aiController.js";
import { verifyToken } from "../../middelware/auth.js";

const router = express.Router();

// All AI endpoints are secured with verifyToken
router.use(verifyToken);

// 1. AI Chat Assistant
router.post("/chat", chatWithAI);
router.get("/chat/history", getAIHistory);

// 2. AI Image Generation
router.post("/image", generateImage);
router.post("/image/edit", editImage);

// 3. Document RAG
router.post("/document/upload", uploadDocumentRAG);
router.post("/document/query", askDocumentRAG);
router.get("/document/status", getDocumentStatus);
router.delete("/document", clearDocumentIndex);

// 4. Chat RAG
router.post("/chat-rag", chatRAG);

// 5. Semantic Search
router.post("/semantic-search", semanticSearch);

// 6. Task Extraction
router.post("/tasks/extract", extractTasks);

export default router;
