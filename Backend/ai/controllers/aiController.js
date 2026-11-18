import Message from "../../models/Message.js";
import { askAI, describeAIError } from "../services/aiService.js";
import { generateHFImage, editImageWithPrompt } from "../services/imageService.js";
import {
    indexDocument,
    queryDocumentRAG,
    getDocumentStatus as getDocStatusService,
    clearDocumentIndex as clearDocIndexService,
    queryChatRAG,
    searchSemantic,
    extractTasks as extractTasksService
} from "../services/ragService.js";

// ==========================================
// 1. AI CHAT ASSISTANT
// ==========================================
export const chatWithAI = async (req, res) => {
    try {
        const { message } = req.body;
        const userEmail = req.user.email;

        if (!message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        // Fetch complete conversation between user and AI
        // (the new message is NOT saved yet, so a failed call + retry
        //  cannot duplicate messages in history)
        const chatHistory = await Message.find({
            $or: [
                { from: userEmail, to: "ai@chatapp.com" },
                { from: "ai@chatapp.com", to: userEmail }
            ]
        }).sort({ createdAt: 1 }).limit(50);

        // Convert conversation into Groq chat format + append the new message
        const messages = chatHistory.map((msg) => ({
            role: msg.from === userEmail ? "user" : "assistant",
            content: msg.message
        }));
        messages.push({ role: "user", content: message.trim() });

        // Generate the reply first; persist both messages only on success
        const reply = await askAI(messages);

        await Message.create({
            from: userEmail,
            to: "ai@chatapp.com",
            message: message.trim(),
            messageType: "text"
        });

        await Message.create({
            from: "ai@chatapp.com",
            to: userEmail,
            message: reply,
            messageType: "text"
        });

        return res.json({
            success: true,
            reply
        });

    } catch (err) {
        console.error("AI Chat Error:", err);
        return res.status(500).json({
            success: false,
            message: describeAIError(err)
        });
    }
};

export const getAIHistory = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const chatHistory = await Message.find({
            $or: [
                { from: userEmail, to: "ai@chatapp.com" },
                { from: "ai@chatapp.com", to: userEmail }
            ]
        }).sort({ createdAt: 1 }).limit(100);

        return res.json({
            success: true,
            messages: chatHistory.map(m => ({
                id: m._id,
                from: m.from,
                to: m.to,
                message: m.message,
                mediaUrl: m.mediaUrl,
                createdAt: m.createdAt,
                isAI: m.from === "ai@chatapp.com"
            }))
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ==========================================
// 2. AI IMAGE GENERATION
// ==========================================
export const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        const userEmail = req.user.email;

        if (!prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Image prompt is required"
            });
        }

        const result = await generateHFImage(prompt);

        // Save record to Message history
        try {
            await Message.create({
                from: "ai@chatapp.com",
                to: userEmail,
                message: `Generated Image: "${prompt}"`,
                mediaUrl: result.imageUrl,
                messageType: "image"
            });
        } catch (e) {
            // ignore logging error
        }

        return res.json({
            success: true,
            imageUrl: result.imageUrl,
            base64Url: result.base64Url,
            prompt
        });

    } catch (err) {
        console.error("Image Gen Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to generate image"
        });
    }
};

// ==========================================
// 2b. AI IMAGE EDITING (two-step prompt flow)
// ==========================================
export const editImage = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { basePrompt, editPrompt } = req.body;

        if (!basePrompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Base image prompt is required (describe the image first)"
            });
        }
        if (!editPrompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Edit prompt is required (describe the change to apply)"
            });
        }

        const result = await editImageWithPrompt(basePrompt.trim(), editPrompt.trim());

        // Save record to Message history (same pattern as image generation)
        try {
            await Message.create({
                from: "ai@chatapp.com",
                to: userEmail,
                message: `Edited Image: "${editPrompt.trim()}"`,
                mediaUrl: result.imageUrl,
                messageType: "image"
            });
        } catch (e) {
            // ignore logging error
        }

        return res.json({
            success: true,
            imageUrl: result.imageUrl,
            base64Url: result.base64Url,
            basePrompt: result.basePrompt,
            editPrompt: result.editPrompt
        });

    } catch (err) {
        console.error("Image Edit Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to edit image"
        });
    }
};

// ==========================================
// 3. DOCUMENT RAG
// ==========================================
export const uploadDocumentRAG = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { fileData, filename, text } = req.body;

        let buffer = null;
        let originalName = filename || "document.txt";

        if (fileData) {
            // Base64 data URL or raw base64
            const cleanBase64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
            buffer = Buffer.from(cleanBase64, "base64");
        } else if (text) {
            buffer = Buffer.from(text, "utf8");
        } else {
            return res.status(400).json({
                success: false,
                message: "No document content provided (send fileData or text)"
            });
        }

        const result = await indexDocument(userEmail, originalName, buffer);

        return res.json({
            success: true,
            message: "Document indexed successfully",
            document: result
        });
    } catch (err) {
        console.error("Document RAG Upload Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to process document"
        });
    }
};

export const askDocumentRAG = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { query } = req.body;

        if (!query?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question query is required"
            });
        }

        const result = await queryDocumentRAG(userEmail, query.trim());

        return res.json({
            success: true,
            answer: result.answer,
            chunks: result.chunks
        });
    } catch (err) {
        console.error("Document RAG Query Error:", err);
        return res.status(500).json({
            success: false,
            message: describeAIError(err)
        });
    }
};

export const getDocumentStatus = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const status = getDocStatusService(userEmail);
        return res.json({
            success: true,
            status
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const clearDocumentIndex = async (req, res) => {
    try {
        const userEmail = req.user.email;
        clearDocIndexService(userEmail);
        return res.json({
            success: true,
            message: "Document index cleared"
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 4. CHAT RAG
// ==========================================
export const chatRAG = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { query, scope, targetEmail, groupId } = req.body;

        if (!query?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Query is required"
            });
        }

        const result = await queryChatRAG(
            userEmail,
            query.trim(),
            scope || "current",
            targetEmail || "",
            groupId || ""
        );

        return res.json({
            success: true,
            answer: result.answer,
            sources: result.sources
        });
    } catch (err) {
        console.error("Chat RAG Error:", err);
        return res.status(500).json({
            success: false,
            message: describeAIError(err)
        });
    }
};

// ==========================================
// 5. SEMANTIC SEARCH
// ==========================================
export const semanticSearch = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { query, scope, targetEmail, groupId } = req.body;

        if (!query?.trim()) {
            return res.json({
                success: true,
                results: []
            });
        }

        const results = await searchSemantic(
            userEmail,
            query.trim(),
            scope || "current",
            targetEmail || "",
            groupId || ""
        );

        return res.json({
            success: true,
            results
        });
    } catch (err) {
        console.error("Semantic Search Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to perform semantic search"
        });
    }
};

// ==========================================
// 6. TASK EXTRACTION
// ==========================================
export const extractTasks = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const { scope, targetEmail, groupId, source } = req.body;

        const result = await extractTasksService(
            userEmail,
            scope || "current",
            targetEmail || "",
            groupId || "",
            source || "chat"
        );

        return res.json({
            success: true,
            tasks: result.tasks,
            sources: result.sources,
            ...(result.note ? { note: result.note } : {})
        });
    } catch (err) {
        console.error("Task Extraction Error:", err);
        return res.status(500).json({
            success: false,
            message: describeAIError(err)
        });
    }
};
