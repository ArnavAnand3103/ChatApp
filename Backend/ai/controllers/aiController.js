import Message from "../../models/Message.js";
import { askAI, askCodingAI, summarizeChat, ragQuery, semanticSearchMessages, extractTasksFromChat, multiAgentOrchestrate } from "../services/aiService.js";
import { generateHFImage, generateSticker, editImage } from "../services/imageService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const saveAIMessage = async ({
    userEmail,
    userMessage,
    aiMessage = "",
    mediaUrl = "",
    messageType = "text"
}) => {

    await Message.create({
        from: userEmail,
        to: "ai@chatapp.com",
        message: userMessage,
        messageType: "text"
    });

    await Message.create({
        from: "ai@chatapp.com",
        to: userEmail,
        message: aiMessage,
        mediaUrl,
        messageType
    });

};



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

        // Save user's latest message
        await Message.create({
            from: userEmail,
            to: "ai@chatapp.com",
            message,
            messageType: "text"
        });

        // Fetch complete conversation
        const chatHistory = await Message.find({
            $or: [
                {
                    from: userEmail,
                    to: "ai@chatapp.com"
                },
                {
                    from: "ai@chatapp.com",
                    to: userEmail
                }
            ]
        }).sort({ createdAt: 1 });

        // Convert conversation into Groq format
        const messages = chatHistory.map((msg) => {
            let content = msg.message || "";
            if (!content && msg.messageType === "image") {
                content = "[Generated Image]";
            }
            return {
                role: msg.from === userEmail ? "user" : "assistant",
                content: content
            };
        }).filter(m => m.content && m.content.trim() !== "");

        // Get AI reply
        const reply = await askAI(messages);

        // Save AI reply
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
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "AI Error"
        });
    }
};

export const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        const userEmail = req.user.email;

        if (!prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Prompt is required"
            });
        }

        console.log(`Generating AI image for prompt: "${prompt}"...`);

        // Generate HF Image
        const imageBuffer = await generateHFImage(prompt);
        const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        // Save messages to MongoDB using existing helper
        await saveAIMessage({
            userEmail,
            userMessage: prompt,
            aiMessage: "",
            mediaUrl: base64Image,
            messageType: "image"
        });

        console.log("AI Image successfully generated and saved.");

        return res.json({
            success: true,
            imageUrl: base64Image
        });

    } catch (err) {
        console.error("AI Image Generation Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to generate image"
        });
    }
};

// ────────────────────────────────────────────────────────────────
// AI Coding Assistant  —  explain code, fix bugs, generate code
// ────────────────────────────────────────────────────────────────
export const codeAssist = async (req, res) => {
    try {
        const { message } = req.body;
        const userEmail = req.user.email;

        if (!message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        // 1. Save the user's coding question
        await Message.create({
            from: userEmail,
            to: "ai@chatapp.com",
            message,
            messageType: "text"
        });

        // 2. Load the full conversation history between user and AI
        const chatHistory = await Message.find({
            $or: [
                { from: userEmail, to: "ai@chatapp.com" },
                { from: "ai@chatapp.com", to: userEmail }
            ]
        }).sort({ createdAt: 1 });

        // 3. Map history to Groq message format, skip empty content
        const messages = chatHistory.map((msg) => {
            let content = msg.message || "";
            if (!content && msg.messageType === "image") {
                content = "[Generated Image]";
            }
            return {
                role: msg.from === userEmail ? "user" : "assistant",
                content
            };
        }).filter(m => m.content && m.content.trim() !== "");

        // 4. Ask the coding-specific AI (with system prompt)
        const reply = await askCodingAI(messages);

        // 5. Save the AI's coding reply
        await Message.create({
            from: "ai@chatapp.com",
            to: userEmail,
            message: reply,
            messageType: "code"
        });

        console.log("✅ Code assistant reply saved.");

        return res.json({
            success: true,
            reply
        });

    } catch (err) {
        console.error("Code Assist Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Code assistant error"
        });
    }
};

// ── Helper: get chat messages between user and a target ───────────
const getChatHistory = async (userEmail, withEmail) => {
    if (withEmail && !withEmail.includes("@")) {
        return Message.find({
            to: withEmail
        }).sort({ createdAt: 1 });
    }
    return Message.find({
        $or: [
            { from: userEmail, to: withEmail },
            { from: withEmail, to: userEmail }
        ]
    }).sort({ createdAt: 1 });
};

// ── Chat Summarization ────────────────────────────────────────────
export const summarizeChatController = async (req, res) => {
    try {
        const { withEmail } = req.body;
        const userEmail = req.user.email;
        if (!withEmail?.trim()) return res.status(400).json({ success: false, message: "withEmail is required" });

        const history = await getChatHistory(userEmail, withEmail);
        if (!history.length) return res.json({ success: true, summary: "No messages found in this conversation." });

        const summary = await summarizeChat(history);
        return res.json({ success: true, summary });
    } catch (err) {
        console.error("Summarize Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to summarize" });
    }
};

// ── Chat RAG ──────────────────────────────────────────────────────
export const chatRAGController = async (req, res) => {
    try {
        const { withEmail, question } = req.body;
        const userEmail = req.user.email;
        if (!withEmail?.trim() || !question?.trim()) return res.status(400).json({ success: false, message: "withEmail and question are required" });

        const history = await getChatHistory(userEmail, withEmail);
        const context = history.map(m => `${m.from}: ${m.message || "[media]"}`).join("\n");

        const answer = await ragQuery(question, context);
        return res.json({ success: true, answer });
    } catch (err) {
        console.error("Chat RAG Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Chat RAG failed" });
    }
};

// ── Document RAG ──────────────────────────────────────────────────
export const documentRAGController = async (req, res) => {
    try {
        const { docText, question } = req.body;
        if (!docText?.trim() || !question?.trim()) return res.status(400).json({ success: false, message: "docText and question are required" });

        const answer = await ragQuery(question, docText);
        return res.json({ success: true, answer });
    } catch (err) {
        console.error("Document RAG Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Document RAG failed" });
    }
};

// ── Semantic Search ───────────────────────────────────────────────
export const semanticSearchController = async (req, res) => {
    try {
        const { withEmail, query } = req.body;
        const userEmail = req.user.email;
        if (!withEmail?.trim() || !query?.trim()) return res.status(400).json({ success: false, message: "withEmail and query are required" });

        const history = await getChatHistory(userEmail, withEmail);
        const indices = await semanticSearchMessages(query, history);
        const results = indices.map(i => history[i]).filter(Boolean);
        return res.json({ success: true, results });
    } catch (err) {
        console.error("Semantic Search Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Semantic search failed" });
    }
};

// ── AI Sticker Generation ─────────────────────────────────────────
export const generateStickerController = async (req, res) => {
    try {
        const { prompt, toChat } = req.body;
        const userEmail = req.user.email;
        if (!prompt?.trim()) return res.status(400).json({ success: false, message: "Prompt is required" });

        const imageBuffer = await generateSticker(prompt);
        const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        if (!toChat || toChat === "ai@chatapp.com") {
            await saveAIMessage({ userEmail, userMessage: `[Sticker] ${prompt}`, aiMessage: "", mediaUrl: base64Image, messageType: "image" });
        }

        return res.json({ success: true, imageUrl: base64Image });
    } catch (err) {
        console.error("Sticker Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Sticker generation failed" });
    }
};

// ── AI Image Editing ──────────────────────────────────────────────
export const editImageController = async (req, res) => {
    try {
        const { originalPrompt, editInstruction, toChat } = req.body;
        const userEmail = req.user.email;
        if (!originalPrompt?.trim() || !editInstruction?.trim()) return res.status(400).json({ success: false, message: "originalPrompt and editInstruction are required" });

        const imageBuffer = await editImage(originalPrompt, editInstruction);
        const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        if (!toChat || toChat === "ai@chatapp.com") {
            await saveAIMessage({ userEmail, userMessage: `[Edit] ${originalPrompt} → ${editInstruction}`, aiMessage: "", mediaUrl: base64Image, messageType: "image" });
        }

        return res.json({ success: true, imageUrl: base64Image });
    } catch (err) {
        console.error("Image Edit Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Image editing failed" });
    }
};

// ── Task Extraction ───────────────────────────────────────────────
export const extractTasksController = async (req, res) => {
    try {
        const { withEmail } = req.body;
        const userEmail = req.user.email;
        if (!withEmail?.trim()) return res.status(400).json({ success: false, message: "withEmail is required" });

        const history = await getChatHistory(userEmail, withEmail);
        if (!history.length) return res.json({ success: true, tasks: [] });

        const tasks = await extractTasksFromChat(history);
        return res.json({ success: true, tasks });
    } catch (err) {
        console.error("Task Extraction Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Task extraction failed" });
    }
};

// ── Multi-Agent AI ────────────────────────────────────────────────
export const multiAgentController = async (req, res) => {
    try {
        const { goal } = req.body;
        if (!goal?.trim()) return res.status(400).json({ success: false, message: "Goal is required" });

        const result = await multiAgentOrchestrate(goal);
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error("Multi-Agent Error:", err);
        return res.status(500).json({ success: false, message: err.message || "Multi-agent task failed" });
    }
};