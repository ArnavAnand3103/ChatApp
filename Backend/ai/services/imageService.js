import axios from "axios";



export const generateHFImage = async (prompt) => {

    try {

        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&private=true&model=flux`;

        const response = await axios.get(url, {
            responseType: "arraybuffer"
        });

        return Buffer.from(response.data);

    } catch (err) {

        console.error("Pollinations AI Error:", err.message);

        throw err;
    }
};

// ── AI Sticker Generation ─────────────────────────────────────────
// Generates a sticker-style flat art image via Pollinations Flux
export const generateSticker = async (prompt) => {
    try {
        const stickerPrompt = `${prompt}, sticker art style, flat design, bold outline, vibrant colors, clean white background, no shadows, cartoon style, cute`;
        const encodedPrompt = encodeURIComponent(stickerPrompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&private=true&model=flux`;
        const response = await axios.get(url, { responseType: "arraybuffer" });
        return Buffer.from(response.data);
    } catch (err) {
        console.error("Sticker Generation Error:", err.message);
        throw err;
    }
};

// ── AI Image Editing ──────────────────────────────────────────────
// Applies a text instruction to an existing image by re-prompting Pollinations
// with a merged description of the original image + the desired edit
export const editImage = async (originalPrompt, editInstruction) => {
    try {
        const mergedPrompt = `${originalPrompt}, but ${editInstruction}. High quality, detailed`;
        const encodedPrompt = encodeURIComponent(mergedPrompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&private=true&model=flux`;
        const response = await axios.get(url, { responseType: "arraybuffer" });
        return Buffer.from(response.data);
    } catch (err) {
        console.error("Image Edit Error:", err.message);
        throw err;
    }
};