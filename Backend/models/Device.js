import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema({
    ownerEmail: {
        type: String,
        required: true,
        index: true
    },
    deviceId: {
        type: Number,
        required: true
    },
    registrationId: {
        type: Number,
        required: true
    },
    identityKey: {
        type: String,
        required: true
    },
    signedPreKey: {
        id: { type: Number, required: true },
        publicKey: { type: String, required: true },
        signature: { type: String, required: true },
        createdAt: { type: Date, required: true }
    },
    oneTimePreKeys: [{
        id: { type: Number, required: true },
        publicKey: { type: String, required: true }
    }],
    kyberPreKey: {
        id: { type: Number, default: null },
        publicKey: { type: String, default: "" },
        signature: { type: String, default: "" },
        createdAt: { type: Date, default: null }
    },
    revokedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

deviceSchema.index({ ownerEmail: 1, deviceId: 1 }, { unique: true });

const Device = mongoose.model("Device", deviceSchema);

export default Device;
