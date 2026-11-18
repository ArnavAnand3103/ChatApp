import mongoose from "mongoose";

const backupSchema = new mongoose.Schema({
    owner: { type: String, required: true, index: true },
    storageKey: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ["uploading", "ready", "failed"],
        default: "uploading"
    },
    version: { type: Number, required: true },
    size: { type: Number, default: 0 },
    includeMedia: { type: Boolean, default: false },
    conversationCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    error: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Backup", backupSchema);
