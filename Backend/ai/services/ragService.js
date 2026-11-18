import fs from "fs";
import path from "path";
import axios from "axios";
import Message from "../../models/Message.js";
import Group from "../../models/Group.js";
import { askAI } from "./aiService.js";

// ==========================================
// 1. IN-MEMORY VECTOR STORE
// ==========================================
class VectorStore {
    constructor() {
        this.collections = new Map(); // collectionName -> Array<{ id, text, metadata, embedding }>
    }

    getOrCreateCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, []);
        }
        return this.collections.get(name);
    }

    add(collectionName, items) {
        const col = this.getOrCreateCollection(collectionName);
        for (const item of items) {
            col.push(item);
        }
    }

    query(collectionName, queryEmbedding, topK = 5) {
        const col = this.getOrCreateCollection(collectionName);
        if (col.length === 0) return [];

        const scored = col.map(item => {
            const similarity = cosineSimilarity(queryEmbedding, item.embedding);
            return {
                ...item,
                similarity
            };
        });

        scored.sort((a, b) => b.similarity - a.similarity);
        return scored.slice(0, topK);
    }

    deleteCollection(name) {
        this.collections.delete(name);
    }

    has(name) {
        return this.collections.has(name) && this.collections.get(name).length > 0;
    }

    getItems(name) {
        return this.collections.get(name) || [];
    }
}

export const vectorStore = new VectorStore();

// ==========================================
// 2. VECTOR SIMILARITY & EMBEDDINGS
// ==========================================
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate Embedding using Hugging Face (MiniLM-L6-v2) with local semantic vectorizer fallback
export async function generateEmbedding(text) {
    const cleanText = String(text || "").trim().slice(0, 512);
    const dim = 128;
    if (!cleanText) return new Array(dim).fill(0);

    // Try HuggingFace Inference API if token is present
    if (process.env.HF_TOKEN) {
        try {
            const res = await axios.post(
                "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
                { inputs: cleanText },
                {
                    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` },
                    timeout: 4000
                }
            );
            if (Array.isArray(res.data) && typeof res.data[0] === "number") {
                return res.data;
            }
            if (Array.isArray(res.data) && Array.isArray(res.data[0])) {
                return res.data[0];
            }
        } catch (err) {
            // Fallback to local semantic vectorizer below
        }
    }

    // High-performance deterministic TF-IDF / Substring n-gram vectorizer (128 dimensions)
    const vec = new Array(dim).fill(0);
    const words = cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let hash = 0;
        for (let j = 0; j < word.length; j++) {
            hash = (hash << 5) - hash + word.charCodeAt(j);
            hash |= 0;
        }
        const index = Math.abs(hash) % dim;
        vec[index] += 1;
    }

    // Normalize vector
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < dim; i++) vec[i] /= norm;
    }
    return vec;
}

// ==========================================
// 3. TEXT CHUNKING & EXTRACTION
// ==========================================
export function chunkText(text, chunkSize = 500, overlap = 100) {
    if (!text || text.length === 0) return [];
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        if (end > text.length) {
            end = text.length;
        } else {
            const nextSpace = text.lastIndexOf(" ", end);
            if (nextSpace > start + 100) {
                end = nextSpace;
            }
        }
        const chunk = text.slice(start, end).trim();
        if (chunk.length > 20) {
            chunks.push(chunk);
        }
        if (end >= text.length) break;
        start = end - overlap;
    }
    return chunks;
}

export async function extractTextFromBuffer(buffer, originalname) {
    const ext = path.extname(originalname || "").toLowerCase();

    if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv" || ext === ".js") {
        return buffer.toString("utf8");
    }

    if (ext === ".pdf") {
        try {
            const pdfParse = (await import("pdf-parse")).default;
            const data = await pdfParse(buffer);
            if (data?.text?.trim()) {
                return data.text;
            }
        } catch (e) {
            // PDF-parse fallback regex extraction
        }

        const raw = buffer.toString("binary");
        const textMatches = [];
        const streamRegex = /BT[\s\S]*?ET/g;
        let match;
        while ((match = streamRegex.exec(raw)) !== null) {
            const block = match[0];
            const tjRegex = /\((.*?)\)\s*Tj/g;
            let tjMatch;
            while ((tjMatch = tjRegex.exec(block)) !== null) {
                textMatches.push(tjMatch[1]);
            }
        }
        const extracted = textMatches.join(" ").replace(/\\([()\\])/g, "$1").trim();
        return extracted.length > 50 ? extracted : buffer.toString("utf8").replace(/[^\x20-\x7E\n]/g, " ");
    }

    return buffer.toString("utf8");
}

// ==========================================
// 4. DOCUMENT RAG
// ==========================================
export async function indexDocument(userId, filename, buffer) {
    const text = await extractTextFromBuffer(buffer, filename);
    if (!text || text.trim().length === 0) {
        throw new Error("Could not extract readable text from document.");
    }

    const chunks = chunkText(text, 500, 100);
    const collectionName = `doc_rag_${userId}`;

    // Clear previous document for this user to keep index clean
    vectorStore.deleteCollection(collectionName);

    const items = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await generateEmbedding(chunk);
        items.push({
            id: `${filename}_chunk_${i}_${Date.now()}`,
            text: chunk,
            metadata: {
                filename,
                chunkIndex: i,
                totalChunks: chunks.length
            },
            embedding
        });
    }

    vectorStore.add(collectionName, items);

    return {
        filename,
        totalChars: text.length,
        totalChunks: chunks.length,
        preview: text.slice(0, 200).replace(/\s+/g, " ") + "..."
    };
}

export async function queryDocumentRAG(userId, query) {
    const collectionName = `doc_rag_${userId}`;
    const queryEmbedding = await generateEmbedding(query);
    const topChunks = vectorStore.query(collectionName, queryEmbedding, 4);

    if (topChunks.length === 0) {
        return {
            answer: "No indexed documents found for your account. Please upload a PDF or text document first.",
            chunks: []
        };
    }

    const contextText = topChunks
        .map((c, i) => `[Document Chunk ${i + 1} (${c.metadata.filename})]:\n${c.text}`)
        .join("\n\n");

    const answer = await askAI(
        [
            {
                role: "system",
                content: "You are an intelligent AI Document Assistant in a chat application. Answer the user's question accurately, concisely, and professionally based strictly on the provided document context. If the answer cannot be determined from the context, clearly explain that. When appropriate, cite the chunk or section."
            },
            {
                role: "user",
                content: `Document Context:\n${contextText}\n\nUser Question:\n${query}`
            }
        ],
        { temperature: 0.2 }
    );

    return {
        answer,
        chunks: topChunks.map(c => ({
            text: c.text,
            filename: c.metadata.filename,
            similarity: Math.round(c.similarity * 100) / 100
        }))
    };
}

export function getDocumentStatus(userId) {
    const collectionName = `doc_rag_${userId}`;
    const items = vectorStore.getItems(collectionName);
    if (!items || items.length === 0) return { indexed: false };
    const first = items[0];
    return {
        indexed: true,
        filename: first.metadata?.filename || "Document",
        totalChunks: items.length
    };
}

export function clearDocumentIndex(userId) {
    const collectionName = `doc_rag_${userId}`;
    vectorStore.deleteCollection(collectionName);
    return { success: true };
}

// ==========================================
// 5. CHAT RAG (Chat History Question Answering)
// ==========================================
export async function queryChatRAG(userEmail, query, scope = "current", targetEmail = "", groupId = "") {
    let messageQuery = {};

    if (scope === "current" && groupId) {
        // Verify user is a member of this group
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userEmail)) {
            throw new Error("Unauthorized to access this group's messages.");
        }
        messageQuery = { to: groupId, deletedForEveryone: { $ne: true } };
    } else if (scope === "current" && targetEmail) {
        messageQuery = {
            $or: [
                { from: userEmail, to: targetEmail },
                { from: targetEmail, to: userEmail }
            ],
            deletedForEveryone: { $ne: true }
        };
    } else {
        // Global scope: messages where user is sender or receiver
        // Also include groups where user is a member
        const userGroups = await Group.find({ members: userEmail }).select("_id");
        const groupIds = userGroups.map(g => String(g._id));

        messageQuery = {
            $or: [
                { from: userEmail },
                { to: userEmail },
                { to: { $in: groupIds } }
            ],
            deletedForEveryone: { $ne: true }
        };
    }

    // Retrieve messages (last 200)
    const rawMessages = await Message.find(messageQuery)
        .sort({ createdAt: -1 })
        .limit(200);

    const validMessages = rawMessages
        .filter(m => m.message && m.message.trim().length > 0 && m.to !== "ai@chatapp.com" && m.from !== "ai@chatapp.com")
        .reverse();

    if (validMessages.length === 0) {
        return {
            answer: "No relevant messages found in this conversation to analyze.",
            sources: []
        };
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Score messages by semantic similarity + keyword match
    const scoredMessages = [];
    for (const msg of validMessages) {
        const msgEmbedding = await generateEmbedding(msg.message);
        const similarity = cosineSimilarity(queryEmbedding, msgEmbedding);
        scoredMessages.push({
            id: msg._id,
            from: msg.from,
            to: msg.to,
            text: msg.message,
            createdAt: msg.createdAt,
            similarity
        });
    }

    // Sort descending by similarity
    scoredMessages.sort((a, b) => b.similarity - a.similarity);
    const topMessages = scoredMessages.slice(0, 10);

    // Format context for Groq
    const contextLines = topMessages.map((m, i) => {
        const time = new Date(m.createdAt).toLocaleString();
        return `[Message ${i + 1}] (${time}) From ${m.from}: "${m.text}"`;
    }).join("\n");

    const answer = await askAI(
        [
            {
                role: "system",
                content: "You are an intelligent Chat History Assistant in a messaging app. Answer the user's question accurately using only the provided message logs. Attribute statements to who said them and mention the approximate date or time if relevant. If the chat logs do not contain the answer, say so clearly."
            },
            {
                role: "user",
                content: `Chat History Context:\n${contextLines}\n\nUser Question:\n${query}`
            }
        ],
        { temperature: 0.2 }
    );

    return {
        answer,
        sources: topMessages.slice(0, 5).map(m => ({
            from: m.from,
            text: m.text,
            createdAt: m.createdAt,
            similarity: Math.round(m.similarity * 100) / 100
        }))
    };
}

// ==========================================
// 6. SEMANTIC SEARCH
// ==========================================
export async function searchSemantic(userEmail, query, scope = "current", targetEmail = "", groupId = "") {
    if (!query || !query.trim()) return [];

    let messageQuery = {};

    if (scope === "current" && groupId) {
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userEmail)) {
            throw new Error("Unauthorized to access this group's messages.");
        }
        messageQuery = { to: groupId, deletedForEveryone: { $ne: true } };
    } else if (scope === "current" && targetEmail) {
        messageQuery = {
            $or: [
                { from: userEmail, to: targetEmail },
                { from: targetEmail, to: userEmail }
            ],
            deletedForEveryone: { $ne: true }
        };
    } else {
        const userGroups = await Group.find({ members: userEmail }).select("_id");
        const groupIds = userGroups.map(g => String(g._id));

        messageQuery = {
            $or: [
                { from: userEmail },
                { to: userEmail },
                { to: { $in: groupIds } }
            ],
            deletedForEveryone: { $ne: true }
        };
    }

    const messages = await Message.find(messageQuery)
        .sort({ createdAt: -1 })
        .limit(300);

    const validMessages = messages.filter(m => m.message && m.message.trim().length > 0 && m.to !== "ai@chatapp.com");

    const queryEmbedding = await generateEmbedding(query);
    const queryLower = query.toLowerCase();

    const results = [];
    for (const msg of validMessages) {
        const msgEmbedding = await generateEmbedding(msg.message);
        let similarity = cosineSimilarity(queryEmbedding, msgEmbedding);

        // Boost if direct word overlap exists
        if (msg.message.toLowerCase().includes(queryLower)) {
            similarity = Math.min(1, similarity + 0.25);
        }

        if (similarity > 0.2) {
            results.push({
                id: msg._id,
                from: msg.from,
                to: msg.to,
                text: msg.message,
                messageType: msg.messageType,
                mediaUrl: msg.mediaUrl,
                createdAt: msg.createdAt,
                score: Math.round(similarity * 100)
            });
        }
    }

    // Also search indexed document chunks if user has an active document
    const docItems = vectorStore.getItems(`doc_rag_${userEmail}`);
    for (const item of docItems) {
        let similarity = cosineSimilarity(queryEmbedding, item.embedding);
        if (item.text.toLowerCase().includes(queryLower)) {
            similarity = Math.min(1, similarity + 0.25);
        }
        if (similarity > 0.25) {
            results.push({
                id: item.id,
                from: `📄 Document: ${item.metadata.filename}`,
                to: userEmail,
                text: item.text,
                messageType: "document",
                createdAt: new Date(),
                score: Math.round(similarity * 100),
                isDocument: true
            });
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 15);
}

// ==========================================
// 7. TASK EXTRACTION (action items from chat or document)
// ==========================================
const TASK_SYSTEM_PROMPT = `You are a task extraction assistant inside a chat application. From the provided conversation transcript or document context, extract every concrete task, action item, to-do, commitment, or agreed deadline.

Return ONLY a valid JSON array, with no markdown fences and no commentary. Each element must be an object with exactly these fields:
{"task": "<concise actionable description>", "owner": "<who is responsible, or 'Unassigned'>", "due": "<deadline or date if mentioned, else 'Not specified'>", "priority": "<High | Medium | Low>"}

Rules:
- Only include real tasks or commitments, not general chatter.
- If there are no tasks at all, return []`;

const robustJsonArrayParse = (raw) => {
    if (Array.isArray(raw)) return raw;
    let text = String(raw || "").trim();
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
    } catch { /* keep trying */ }
    // Extract the first JSON array embedded in the text
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end > start) {
        try {
            const parsed = JSON.parse(text.slice(start, end + 1));
            if (Array.isArray(parsed)) return parsed;
        } catch { /* give up */ }
    }
    return null;
};

export async function extractTasks(userEmail, scope = "current", targetEmail = "", groupId = "", source = "chat") {
    let contextLines = "";
    let sources = [];

    if (source === "document") {
        const collectionName = `doc_rag_${userEmail}`;
        const items = vectorStore.getItems(collectionName);
        if (!items || items.length === 0) {
            return {
                tasks: [],
                sources: [],
                note: "No indexed document found. Upload a document in the Document RAG tab first."
            };
        }
        contextLines = items
            .slice(0, 30)
            .map((c, i) => `[Document Chunk ${i + 1} (${c.metadata.filename})]:\n${c.text}`)
            .join("\n\n");
        sources = items.slice(0, 5).map(c => ({
            text: c.text,
            filename: c.metadata.filename
        }));
    } else {
        // Chat source – same authorization scoping as Chat RAG / Semantic Search
        let messageQuery = {};

        if (scope === "current" && groupId) {
            const group = await Group.findById(groupId);
            if (!group || !group.members.includes(userEmail)) {
                throw new Error("Unauthorized to access this group's messages.");
            }
            messageQuery = { to: groupId, deletedForEveryone: { $ne: true } };
        } else if (scope === "current" && targetEmail) {
            messageQuery = {
                $or: [
                    { from: userEmail, to: targetEmail },
                    { from: targetEmail, to: userEmail }
                ],
                deletedForEveryone: { $ne: true }
            };
        } else {
            const userGroups = await Group.find({ members: userEmail }).select("_id");
            const groupIds = userGroups.map(g => String(g._id));
            messageQuery = {
                $or: [
                    { from: userEmail },
                    { to: userEmail },
                    { to: { $in: groupIds } }
                ],
                deletedForEveryone: { $ne: true }
            };
        }

        const rawMessages = await Message.find(messageQuery)
            .sort({ createdAt: -1 })
            .limit(200);

        const validMessages = rawMessages
            .filter(m => m.message && m.message.trim().length > 0 && m.to !== "ai@chatapp.com" && m.from !== "ai@chatapp.com")
            .reverse();

        if (validMessages.length === 0) {
            return {
                tasks: [],
                sources: [],
                note: "No messages found in this scope to extract tasks from."
            };
        }

        contextLines = validMessages
            .map((m, i) => {
                const time = new Date(m.createdAt).toLocaleString();
                return `[Message ${i + 1}] (${time}) From ${m.from}: "${m.message}"`;
            })
            .join("\n");

        sources = validMessages.slice(-5).reverse().map(m => ({
            from: m.from,
            text: m.message,
            createdAt: m.createdAt
        }));
    }

    const answer = await askAI(
        [
            { role: "system", content: TASK_SYSTEM_PROMPT },
            {
                role: "user",
                content: `Context:\n${contextLines}\n\nExtract all tasks as a JSON array.`
            }
        ],
        { temperature: 0.1 }
    );

    let tasks = robustJsonArrayParse(answer) || [];

    // Normalize / clean the task objects
    tasks = tasks
        .filter(t => t && typeof t === "object" && String(t.task || "").trim())
        .map(t => ({
            task: String(t.task).trim(),
            owner: String(t.owner || "Unassigned").trim() || "Unassigned",
            due: String(t.due || "Not specified").trim() || "Not specified",
            priority: ["High", "Medium", "Low"].includes(t.priority) ? t.priority : "Medium"
        }));

    return { tasks, sources };
}
