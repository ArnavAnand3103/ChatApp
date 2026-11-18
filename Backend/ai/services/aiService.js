import Groq from "groq-sdk";

// Chat models available on this Groq account, best first.
// Fallbacks keep AI working if a model is ever decommissioned.
const GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
];

const isAuthError = (err) => {
    const raw = err?.response?.data?.error?.message || err?.message || String(err || "");
    return /invalid api key|expired_api_key|unauthorized|api key not valid/i.test(raw);
};

export const askAI = async (messages, { temperature } = {}) => {
    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    let lastError = null;
    for (const model of GROQ_MODELS) {
        try {
            const completion = await groq.chat.completions.create({
                model,
                messages,
                ...(temperature !== undefined ? { temperature } : {})
            });
            return completion.choices[0]?.message?.content || "No response generated.";
        } catch (err) {
            // Auth errors affect every model – fail fast so the caller
            // can surface a clear message instead of retrying blindly
            if (isAuthError(err)) throw err;
            lastError = err;
        }
    }
    throw lastError || new Error("AI request failed");
};

// Map raw provider errors to user-friendly messages (never leaks keys)
export const describeAIError = (err) => {
    const raw = err?.response?.data?.error?.message || err?.message || String(err || "");
    if (/invalid api key|expired_api_key|api key not valid/i.test(raw)) {
        return "The AI service is not configured correctly (invalid provider API key). Please contact the administrator.";
    }
    if (/rate limit|too many requests/i.test(raw)) {
        return "The AI service is busy right now. Please wait a moment and try again.";
    }
    if (/does not exist|model_not_found|decommissioned/i.test(raw)) {
        return "The AI model is temporarily unavailable. Please try again later.";
    }
    return "The AI service is temporarily unavailable. Please try again.";
};
