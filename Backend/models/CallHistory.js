import mongoose from "mongoose";

const CallHistorySchema = new mongoose.Schema(
    {
        caller: {
            type: String,
            required: true,
        },

        receiver: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            enum: ["audio", "video"],
            default: "audio",
        },

        status: {
            type: String,
            enum: ["completed", "rejected", "missed"],
            required: true,
        },

        startedAt: {
            type: Date,
            default: Date.now,
        },

        endedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const CallHistory = mongoose.model(
    "CallHistory",
    CallHistorySchema
);

export default CallHistory;