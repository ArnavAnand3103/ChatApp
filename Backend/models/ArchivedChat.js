import mongoose from "mongoose";

const archivedChatSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },

    chatId: {
        type: String,
        required: true
    },

    chatType: {
        type: String,
        enum: ["private", "group"],
        required: true
    }
});

export default mongoose.model(
    "ArchivedChat",
    archivedChatSchema
);