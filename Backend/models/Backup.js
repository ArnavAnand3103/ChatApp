import mongoose from "mongoose";

const backupSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true,
        unique: true
    },
    messages: {
        type: Array,
        default: []
    },
    mediaMessages: {
        type: Array,
        default: []
    },
    settings: {
        type: Object,
        default: {}
    },
    backupType: {
        type: String,
        default: "full"
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Backup", backupSchema);
