import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
        // ignore
    }
}

// Core generation pipeline shared by text-to-image and image editing
const generateImageFromPrompt = async (prompt) => {
    let buffer = null;

    // Try HuggingFace FLUX.1-dev if token exists
    if (process.env.HF_TOKEN) {
        try {
            console.log("Calling Hugging Face FLUX.1-dev...");
            const response = await axios.post(
                "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
                { inputs: prompt },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.HF_TOKEN}`,
                        Accept: "image/png"
                    },
                    responseType: "arraybuffer",
                    timeout: 20000
                }
            );
            if (response.data && response.data.byteLength > 1000) {
                buffer = Buffer.from(response.data);
            }
        } catch (err) {
            console.warn("HF FLUX error, falling back to Pollinations AI:", err.response?.status || err.message);
        }
    }

    // High quality reliable fallback: Pollinations AI
    if (!buffer) {
        console.log("Generating via Pollinations AI fallback...");
        const encoded = encodeURIComponent(prompt);
        const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
        const res = await axios.get(pollUrl, {
            responseType: "arraybuffer",
            timeout: 25000
        });
        buffer = Buffer.from(res.data);
    }

    return buffer;
};

const saveImageBuffer = (buffer) => {
    // Save image to local uploads for static serving & sharing in chat
    const filename = `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `http://localhost:5001/uploads/${filename}`;
    const base64Url = `data:image/png;base64,${buffer.toString("base64")}`;

    return {
        filename,
        imageUrl,
        base64Url
    };
};

export const generateHFImage = async (prompt) => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) throw new Error("Prompt is required");

    const buffer = await generateImageFromPrompt(cleanPrompt);
    return saveImageBuffer(buffer);
};

// ==========================================
// IMAGE EDITING (prompt-based, two-step flow)
// Step 1: base image described by basePrompt (generated via /api/ai/image)
// Step 2: editPrompt describes the change; the image is regenerated as
//         basePrompt + editPrompt so the result reflects both.
// ==========================================
export const editImageWithPrompt = async (basePrompt, editPrompt) => {
    const cleanBase = String(basePrompt || "").trim();
    const cleanEdit = String(editPrompt || "").trim();

    if (!cleanBase) throw new Error("Base image prompt is required");
    if (!cleanEdit) throw new Error("Edit prompt is required");

    const combinedPrompt = `${cleanBase}. Applied edit: ${cleanEdit}`;
    const buffer = await generateImageFromPrompt(combinedPrompt);
    const result = saveImageBuffer(buffer);

    return {
        ...result,
        basePrompt: cleanBase,
        editPrompt: cleanEdit,
        combinedPrompt
    };
};
