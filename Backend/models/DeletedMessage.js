import mongoose from "mongoose";

const deletedMessageSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },

    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        required: true
    }
});

export default mongoose.model(
    "DeletedMessage",
    deletedMessageSchema
);