import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();
import { codingSystemPrompt, summarizationPrompt, ragSystemPrompt, semanticSearchPrompt, taskExtractionPrompt, multiAgentPlannerPrompt, multiAgentExecutorPrompt } from "../prompts/systemPrompt.js";

export const askAI = async (messages) => {

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    const completion =
        await groq.chat.completions.create({

            model: "llama-3.3-70b-versatile",

            messages

        });

    return completion.choices[0].message.content;
};

// Coding assistant — always prepends a strong system prompt
export const askCodingAI = async (messages) => {

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: codingSystemPrompt },
            ...messages
        ]
    });

    return completion.choices[0].message.content;
};

// ── Chat Summarization ────────────────────────────────────────────
export const summarizeChat = async (chatMessages) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formatted = chatMessages
        .map((m) => `${m.from}: ${m.message || "[media]"}`)
        .join("\n");
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: summarizationPrompt },
            { role: "user", content: `Summarize this conversation:\n\n${formatted}` }
        ]
    });
    return completion.choices[0].message.content;
};

// ── RAG (Chat or Document context) ───────────────────────────────
export const ragQuery = async (question, context) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: ragSystemPrompt },
            { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }
        ]
    });
    return completion.choices[0].message.content;
};

// ── Semantic Search ───────────────────────────────────────────────
export const semanticSearchMessages = async (query, messages) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const numbered = messages
        .map((m, i) => `[${i}] ${m.from}: ${m.message || "[media]"}`)
        .join("\n");
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: semanticSearchPrompt },
            { role: "user", content: `Messages:\n${numbered}\n\nQuery: ${query}` }
        ]
    });
    const raw = completion.choices[0].message.content.trim();
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
        return [];
    }
};

// ── Task Extraction ───────────────────────────────────────────────
export const extractTasksFromChat = async (chatMessages) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formatted = chatMessages
        .map((m) => `${m.from}: ${m.message || "[media]"}`)
        .join("\n");
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: taskExtractionPrompt },
            { role: "user", content: `Extract tasks from this conversation:\n\n${formatted}` }
        ]
    });
    const raw = completion.choices[0].message.content.trim();
    try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
        return [];
    }
};

// ── Multi-Agent Orchestration ─────────────────────────────────────
export const multiAgentOrchestrate = async (goal) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Step 1: Planner agent — break goal into sub-tasks
    const planCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: multiAgentPlannerPrompt },
            { role: "user", content: `Goal: ${goal}` }
        ]
    });
    const planRaw = planCompletion.choices[0].message.content.trim();
    let subTasks = [];
    try {
        const jsonMatch = planRaw.match(/\[[\s\S]*\]/);
        subTasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [goal];
    } catch {
        subTasks = [goal];
    }

    // Step 2: Executor agent — run each sub-task
    const results = [];
    for (const subTask of subTasks) {
        const execCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: multiAgentExecutorPrompt },
                { role: "user", content: `Complete this task: ${subTask}` }
            ]
        });
        results.push({
            task: subTask,
            result: execCompletion.choices[0].message.content
        });
    }
    return { goal, subTasks, results };
};
