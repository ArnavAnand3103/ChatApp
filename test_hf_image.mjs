// Test HF image endpoints: text-to-image (existing) + Kontext image editing (new)
import dotenv from "dotenv";
dotenv.config({ path: "Backend/.env" });

const HF_TOKEN = process.env.HF_TOKEN;

// 1. Test existing text-to-image path (FLUX.1-dev)
console.log("Testing FLUX.1-dev (text-to-image)...");
try {
    const res = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev", {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json", Accept: "image/png" },
        body: JSON.stringify({ inputs: "a small red circle on white background" }),
        signal: AbortSignal.timeout(30000)
    });
    if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`FLUX.1-dev: OK (${buf.length} bytes)`);
    } else {
        console.log(`FLUX.1-dev: FAILED (${res.status}) ${(await res.text()).slice(0, 200)}`);
    }
} catch (e) {
    console.log("FLUX.1-dev: ERROR", e.message);
}

// 2. Build a tiny test PNG (1x1 red pixel) as base image for Kontext test
const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

console.log("\nTesting FLUX.1-Kontext-dev (image editing)...");
try {
    const res = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-Kontext-dev", {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json", Accept: "image/png" },
        body: JSON.stringify({
            inputs: "change the circle to blue",
            image: `data:image/png;base64,${tinyPngBase64}`
        }),
        signal: AbortSignal.timeout(60000)
    });
    if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`Kontext: OK (${buf.length} bytes)`);
    } else {
        console.log(`Kontext: FAILED (${res.status}) ${(await res.text()).slice(0, 300)}`);
    }
} catch (e) {
    console.log("Kontext: ERROR", e.message);
}
