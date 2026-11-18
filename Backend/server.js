
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import User from './models/User.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import ArchivedChat from "./models/ArchivedChat.js";

import Group from "./models/Group.js";
import DeletedMessage from "./models/DeletedMessage.js";
import Device from "./models/Device.js";

import registerCallSocket from "./sockets/callSocket.js";

import aiRoutes from "./ai/routes/aiRoutes.js";


// Load environment variables from .env file
// Resolve relative to this file so the server finds Backend/.env
// regardless of the directory it was started from (e.g. `npm start` from repo root)
import dotenv from 'dotenv';
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

import { OAuth2Client } from 'google-auth-library';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Message from './models/Message.js';
import BlockedUser from './models/BlockedUser.js';
import Report from './models/Report.js';
import Backup from './models/Backup.js';
import {
    BACKUP_VERSION,
    decryptBackup,
    downloadBackup,
    encryptBackup,
    uploadBackup
} from './services/backupStorage.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));//middleware

// Serve static files from the 'Frontend' folder
app.use(express.static(path.join(__dirname, '../Frontend')));
// Serve the root folder as well so images like 'discordimg.jpg' are accessible
app.use(express.static(path.join(__dirname, '../')));

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chatapp";

mongoose.connect(MONGO_URI)
     .then(async () => {
        console.log("DB connected successfully to:", MONGO_URI.startsWith("mongodb+srv") ? "MongoDB Atlas (Cloud)" : MONGO_URI);

        await createAIUser();
    })
    .catch(err => console.log("MongoDB Connection Error:", err.message));

const server = http.createServer(app);
const io = new Server(server, {// attach to existng server
    cors: {
        origin: "*"
    }
});
const loginLimiter=rateLimit({
    windowMs:60*1000,
    max:5,
    message:{message:"Too many login attempts.Try again later."}
});

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : "SECRET_KEY");
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const sanitizeUser = (userDoc) => {
    if (!userDoc) return null;
    return {
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone || "",
        about: userDoc.about || "",
        photo: userDoc.photo || "",
        isOnline: !!userDoc.isOnline,
        lastSeen: userDoc.lastSeen || null
    };
};
import CallHistory from "./models/CallHistory.js";

const serializeMessage = (messageDoc) => {
    if (!messageDoc) return null;
    return {
        _id: String(messageDoc._id),
        from: String(messageDoc.from || ""),
        to: String(messageDoc.to || ""),
        message: String(messageDoc.message || ""),
            replyTo: messageDoc.replyTo || null,
            replyText: String(messageDoc.replyText || ""),
            replySender: String(messageDoc.replySender || ""),
        messageType: String(messageDoc.messageType || "text"),
        mediaUrl: String(messageDoc.mediaUrl || ""),

        latitude: messageDoc.latitude,
        longitude: messageDoc.longitude,
        locationName: messageDoc.locationName || "",
        isLive: messageDoc.isLive,
        liveLocationId: messageDoc.liveLocationId || "",
        expiresAt: messageDoc.expiresAt,

        createdAt: messageDoc.createdAt,
        clientMessageId: String(messageDoc.clientMessageId || ""),
            status: String(messageDoc.status || "offline"),
        starred: !!messageDoc.starred,
        forwarded: !!messageDoc.forwarded,
        edited: !!messageDoc.edited,
        fileName: String(messageDoc.fileName || ""),
        deletedForEveryone: !!messageDoc.deletedForEveryone,
        reactions: Array.isArray(messageDoc.reactions) ? messageDoc.reactions : [],
        isEncrypted: !!messageDoc.isEncrypted,
        encryptionVersion: messageDoc.encryptionVersion || 1,
        ciphertext: String(messageDoc.ciphertext || ""),
        ciphertextType: messageDoc.ciphertextType || 0,
        senderDeviceId: messageDoc.senderDeviceId ?? null,
        recipientDeviceId: messageDoc.recipientDeviceId ?? null,
        encryptedPayload: messageDoc.encryptedPayload || null
    };
};

    const backupMessageFields = (message) => ({
        from: message.from,
        to: message.to,
        message: message.message || "",
        replyTo: message.replyTo ? String(message.replyTo) : null,
        replyText: message.replyText || "",
        replySender: message.replySender || "",
        messageType: message.messageType || "text",
        latitude: message.latitude ?? null,
        longitude: message.longitude ?? null,
        locationName: message.locationName || "",
        isLive: !!message.isLive,
        liveLocationId: message.liveLocationId || "",
        expiresAt: message.expiresAt || null,
        mediaUrl: message.mediaUrl || "",
        fileName: message.fileName || "",
        clientMessageId: message.clientMessageId || "",
        starred: !!message.starred,
        edited: !!message.edited,
        forwarded: !!message.forwarded,
        reactions: Array.isArray(message.reactions) ? message.reactions : [],
        deletedForEveryone: !!message.deletedForEveryone,
        createdAt: message.createdAt
    });

    const mediaMessageTypes = new Set(["image", "media", "video", "document", "voice"]);
    const isMediaMessage = (message) => mediaMessageTypes.has(message.messageType) || Boolean(message.mediaUrl);

    const collectBackupData = async (owner, { withUser, groupId, includeMedia, settings = {} } = {}) => {
        const groups = await Group.find({ members: owner }).select("_id name members admin photo").lean();
        const groupIds = groups.map(group => String(group._id));
        const target = withUser ? normalizeEmail(withUser) : null;
        let query;
        if (groupId) {
            if (!groupIds.includes(String(groupId))) throw new Error("You are not a member of this group");
            query = { to: String(groupId) };
        } else if (target) {
            query = { $or: [{ from: owner, to: target }, { from: target, to: owner }] };
        } else {
            query = {
                $or: [
                    { from: owner },
                    { to: owner },
                    ...(groupIds.length ? [{ to: { $in: groupIds } }] : [])
                ]
            };
        }
        const messages = await Message.find(query).sort({ createdAt: 1 }).lean();
        const normalizedMessages = messages
            .filter(message => message.from === owner || message.to === owner || groupIds.includes(String(message.to)))
            .map(message => {
                const backedUp = backupMessageFields(message);
                if (!includeMedia) {
                    backedUp.mediaUrl = "";
                    backedUp.fileName = "";
                }
                return backedUp;
            });
        const conversations = [
            ...groups.map(group => ({
                type: "group",
                id: String(group._id),
                name: group.name,
                members: group.members,
                admin: group.admin,
                photo: group.photo || ""
            })),
            ...[...new Set(normalizedMessages
                .filter(message => !groupIds.includes(String(message.to)))
                .map(message => message.from === owner ? message.to : message.from))]
                .map(email => ({ type: "private", id: email }))
        ];
        const media = includeMedia
            ? normalizedMessages
                .filter(isMediaMessage)
                .map(message => ({
                    clientMessageId: message.clientMessageId,
                    messageType: message.messageType,
                    fileName: message.fileName,
                    mediaUrl: message.mediaUrl
                }))
            : [];
        return {
            format: "chatapp-backup",
            version: BACKUP_VERSION,
            createdAt: new Date().toISOString(),
            owner,
            conversations,
            messages: normalizedMessages,
            media,
            settings: {
                theme: settings.theme === "light" ? "light" : "dark",
                includeMedia: !!includeMedia
            }
        };
    };

    const restoreBackupData = async (owner, payload) => {
        if (!payload || payload.format !== "chatapp-backup" || payload.version !== BACKUP_VERSION) {
            throw new Error("Unsupported backup version or format");
        }
        const groups = await Group.find({ members: owner }).select("_id members").lean();
        const groupIds = new Set(groups.map(group => String(group._id)));
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        let insertedCount = 0;
        let skippedCount = 0;
        for (const message of messages) {
            const from = normalizeEmail(message.from);
            const to = String(message.to || "");
            const allowed = from === owner || to === owner || groupIds.has(to);
            if (!allowed || !from || !to || (!message.message && !message.mediaUrl)) {
                skippedCount++;
                continue;
            }
            const duplicate = await Message.exists({
                from,
                to,
                createdAt: new Date(message.createdAt),
                message: message.message || "",
                clientMessageId: message.clientMessageId || ""
            });
            if (duplicate) {
                skippedCount++;
                continue;
            }
            await Message.create({
                from,
                to,
                message: message.message || "",
                replyText: message.replyText || "",
                replySender: message.replySender || "",
                messageType: message.messageType || "text",
                latitude: message.latitude ?? null,
                longitude: message.longitude ?? null,
                locationName: message.locationName || "",
                isLive: !!message.isLive,
                liveLocationId: message.liveLocationId || "",
                expiresAt: message.expiresAt || null,
                mediaUrl: message.mediaUrl || "",
                fileName: message.fileName || "",
                clientMessageId: message.clientMessageId || "",
                starred: !!message.starred,
                edited: !!message.edited,
                forwarded: !!message.forwarded,
                reactions: Array.isArray(message.reactions) ? message.reactions : [],
                deletedForEveryone: !!message.deletedForEveryone,
                createdAt: new Date(message.createdAt)
            });
            insertedCount++;
        }
        return {
            insertedCount,
            skippedCount,
            total: messages.length,
            settings: payload.settings || {}
        };
    };

const isStrongPassword = (password) => {
    if (typeof password !== "string") return false;
    return password.length >= 8;
};

const isBase64Key = (value, maxLength = 4096) =>
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const publicDeviceBundle = (device) => ({
    ownerEmail: device.ownerEmail,
    deviceId: device.deviceId,
    registrationId: device.registrationId,
    identityKey: device.identityKey,
    signedPreKey: device.signedPreKey,
    oneTimePreKeys: device.oneTimePreKeys,
    kyberPreKey: device.kyberPreKey || null
});

const claimOneTimePreKey = async (ownerEmail, deviceId) => {
    const device = await Device.findOne({ ownerEmail, deviceId, revokedAt: null });
    if (!device) return null;
    const preKey = Array.isArray(device.oneTimePreKeys) && device.oneTimePreKeys.length ? device.oneTimePreKeys[0] : null;
    if (preKey) {
        device.oneTimePreKeys = device.oneTimePreKeys.slice(1);
        await device.save();
    }
    return { bundle: publicDeviceBundle(device), preKey };
};

const requireAuth = (req, res, next) => {
    if (!jwtSecret) {
        return res.status(500).json({ error: "JWT secret not set" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Missing auth token" });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = {
            email: normalizeEmail(decoded.email),
            name: decoded.name || ""
        };
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

app.post("/e2ee/devices", requireAuth, async (req, res) => {
    try {
        const {
            deviceId,
            registrationId,
            identityKey,
            signedPreKey,
            oneTimePreKeys,
            kyberPreKey
        } = req.body || {};

        const validKyber = kyberPreKey == null || (
            Number.isInteger(kyberPreKey.id) &&
            isBase64Key(kyberPreKey.publicKey) &&
            isBase64Key(kyberPreKey.signature)
        );

        if (!Number.isInteger(deviceId) || deviceId < 1 || deviceId > 255 ||
            !Number.isInteger(registrationId) || registrationId < 1 || registrationId > 16380 ||
            !isBase64Key(identityKey) ||
            !signedPreKey || !Number.isInteger(signedPreKey.id) ||
            !isBase64Key(signedPreKey.publicKey) ||
            !isBase64Key(signedPreKey.signature) ||
            !Array.isArray(oneTimePreKeys) ||
            oneTimePreKeys.length > 100 ||
            oneTimePreKeys.some((key) =>
                !Number.isInteger(key?.id) || !isBase64Key(key?.publicKey)
            ) || !validKyber) {
            return res.status(400).json({ message: "Invalid device key bundle" });
        }

        const device = await Device.findOneAndUpdate(
            { ownerEmail: req.user.email, deviceId },
            {
                ownerEmail: req.user.email,
                deviceId,
                registrationId,
                identityKey,
                signedPreKey: {
                    id: signedPreKey.id,
                    publicKey: signedPreKey.publicKey,
                    signature: signedPreKey.signature,
                    createdAt: new Date()
                },
                oneTimePreKeys: oneTimePreKeys.map((key) => ({
                    id: key.id,
                    publicKey: key.publicKey
                })),
                kyberPreKey: kyberPreKey ? {
                    id: kyberPreKey.id,
                    publicKey: kyberPreKey.publicKey,
                    signature: kyberPreKey.signature,
                    createdAt: new Date()
                } : undefined,
                revokedAt: null
            },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        return res.status(200).json({ device: publicDeviceBundle(device) });
    } catch (error) {
        console.error("Failed to register E2EE device:", error);
        return res.status(500).json({ message: "Failed to register E2EE device" });
    }
});

app.get("/e2ee/devices/:email", requireAuth, async (req, res) => {
    try {
        const ownerEmail = normalizeEmail(req.params.email);
        const claim = req.query.claim === "1" || req.query.claim === "true";
        if (!ownerEmail) return res.status(400).json({ message: "Email is required" });

        const devices = await Device.find({ ownerEmail, revokedAt: null })
            .select("-_id ownerEmail deviceId registrationId identityKey signedPreKey oneTimePreKeys kyberPreKey")
            .lean();
        if (!claim) return res.json({ devices: devices.map(publicDeviceBundle) });

        // claim one-time prekey from first active device for session setup
        const active = devices[0];
        if (!active) return res.json({ devices: [] });
        const claimed = await claimOneTimePreKey(ownerEmail, active.deviceId);
        const b = claimed?.bundle;
        if (b && claimed.preKey) b.preKey = claimed.preKey;
        return res.json({ devices: b ? [b] : [] });
    } catch (error) {
        console.error("Failed to load E2EE devices:", error);
        return res.status(500).json({ message: "Failed to load E2EE devices" });
    }
});

app.delete("/e2ee/devices/:deviceId", requireAuth, async (req, res) => {
    try {
        const deviceId = Number(req.params.deviceId);
        if (!Number.isInteger(deviceId)) {
            return res.status(400).json({ message: "Invalid device ID" });
        }

        const device = await Device.findOneAndUpdate(
            { ownerEmail: req.user.email, deviceId, revokedAt: null },
            { revokedAt: new Date() },
            { new: true }
        ).lean();
        if (!device) return res.status(404).json({ message: "Device not found" });
        return res.json({ deviceId, revoked: true });
    } catch (error) {
        console.error("Failed to revoke E2EE device:", error);
        return res.status(500).json({ message: "Failed to revoke E2EE device" });
    }
});

const users = {};
const getOnlineEmails = () => {
    return [...new Set(
        Object.values(users)
            .map((user) => user?.email)
            .filter(Boolean)
    )];
};
const createAIUser = async () => {

    try {

        const existing = await User.findOne({
            email: "ai@chatapp.com"
        });

        if (existing) return;

        const hashedPassword = await bcrypt.hash("aiassistant123", 10);

        await User.create({
            name: "🤖 AI Assistant",
            email: "ai@chatapp.com",
            password: hashedPassword,
            photo: "",
            isOnline: false
        });

        console.log("✅ AI Assistant created");

    } catch (err) {

        console.error(err);

    }

};
function logLoginAttempt(email,success,ip){
    console.log({
        email,
        success,
        ip,
        time:new Date().toISOString()
    });
}

io.use((socket, next) => {
    if (!jwtSecret) {
        return next(new Error("JWT secret not set"));
    }

    const handshakeToken = socket.handshake.auth?.token;
    const headerTokenRaw = socket.handshake.headers?.authorization || "";
    const headerToken = headerTokenRaw.startsWith("Bearer ") ? headerTokenRaw.slice(7) : "";
    const token = handshakeToken || headerToken;

    if (!token) {
        return next(new Error("Unauthorized"));
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = {
            email: normalizeEmail(decoded.email),
            name: decoded.name || decoded.email || "Unknown"
        };
        next();
    } catch {
        return next(new Error("Unauthorized"));
    }
});

io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    users[socket.id] = {
        name: socket.user.name,
        email: socket.user.email
    };

    User.updateOne(
        { email: socket.user.email },
        { $set: { isOnline: true } }
    ).catch(() => { });

    io.emit("userStatus", {
        email: socket.user.email,
        status: "online"
    });

    socket.emit("onlineUsers", getOnlineEmails());

    socket.on("getOnlineUsers", () => {
        socket.emit("onlineUsers", getOnlineEmails());
    });

    socket.on("join", async (userData) => {
        if (userData?.name) {
            users[socket.id].name = userData.name;
        }

        await User.updateOne(
            { email: socket.user.email },
            { $set: { isOnline: true } }
        ).catch(() => { });

        socket.emit("onlineUsers", getOnlineEmails());
    });

    socket.on("checkBlock", async ({ me, other }) => {
        const normalizedMe = normalizeEmail(me);
        const normalizedOther = normalizeEmail(other);
        const exists = await BlockedUser.findOne({
            user: normalizedMe,
            blockedUser: normalizedOther
        });
        socket.emit("blockStatus", {
            blocked: !!exists
        })
    });
    socket.on("toggleBlock", async ({ me, other }) => {
        const normalizedMe = normalizeEmail(me);
        const normalizedOther = normalizeEmail(other);
        const exists = await BlockedUser.findOne({
            user: normalizedMe,
            blockedUser: normalizedOther
        });
        if (exists) {
            await BlockedUser.deleteOne({
                user: normalizedMe,
                blockedUser: normalizedOther
            });
            socket.emit("blockStatus", { blocked: false });

        } else {
            await BlockedUser.create({
                user: normalizedMe,
                blockedUser: normalizedOther
            });
            socket.emit("blockStatus", { blocked: true });
        }

    })

    socket.on("privateMessage", async ({ to, message = "", messageType = "text", mediaUrl = "", fileName = "", clientMessageId = "",replyTo=null,replyText="",replySender="" ,forwarded=false,latitude = null,longitude = null,locationName = "",
    isLive = false,
    liveLocationId = "",
    expiresAt = null,
    isEncrypted = false, ciphertext = "", ciphertextType = 0, senderDeviceId = null, recipientDeviceId = null, encryptedPayload = null, encryptionVersion = 1 }) => {

        console.log("PRIVATE LOCATION:", {
    messageType,
    latitude,
    longitude
});
        console.log("Forwarded received:", forwarded);
        const from = users[socket.id];
        const targetEmail = normalizeEmail(to);
        const senderEmail = normalizeEmail(from?.email);
        const allowedMsgTypes = ["text", "image", "video", "document","audio","voice","location"];
        const safeMessageType = allowedMsgTypes.includes(messageType) ? messageType : "text";
        const text = String(message || "").trim();
        const media = String(mediaUrl || "");

        console.log("privateMessage received:", {
            senderEmail,
            targetEmail,
            messageType: safeMessageType,
            clientMessageId
        });

        // Validate sender and receiver first
        if (!senderEmail || !targetEmail) {
            socket.emit("messageStatus", {
                ok: false,
                message: "Invalid sender or receiver"
            });
            return;
        }

        if (senderEmail === targetEmail) {
            socket.emit("messageStatus", {
                ok: false,
                message: "Cannot message yourself"
            });
            return;
        }

        const enc = Boolean(isEncrypted && ciphertext);
        if (!enc) {
            if (safeMessageType === "text" && !text) {
                socket.emit("messageStatus", { ok: false, message: "Message cannot be empty" });
                return;
            }
            if ((safeMessageType === "image" || safeMessageType === "video" || safeMessageType === "document" || safeMessageType === "audio" || safeMessageType === "voice") && !media) {
                socket.emit("messageStatus", { ok: false, message: "Media payload missing" });
                return;
            }
        } else {
            if (typeof ciphertext !== "string" || !ciphertext.trim()) {
                socket.emit("messageStatus", { ok: false, message: "Encrypted payload missing" });
                return;
            }
        }

        // Check if sender is blocked by receiver
        const isBlocked = await BlockedUser.findOne({
            user: targetEmail,
            blockedUser: senderEmail
        });
        // Check if receiver is blocked by sender (sender has blocked receiver)
        const youBlocked = await BlockedUser.findOne({
            user: senderEmail,
            blockedUser: targetEmail
        });
        if (isBlocked) {
            socket.emit("messageStatus", {
                ok: false,
                message: "You are blocked by this user."
            });
            return;
        }
        if (youBlocked) {
            socket.emit("messageStatus", {
                ok: false,
                message: "You have blocked this user. Unblock to send messages."
            });
            return;
        }

        try {
            const receiverSockets = Object.keys(users).filter(
                key => users[key]?.email === targetEmail
            );
            const deliveryStatus = receiverSockets.length > 0 ? "delivered" : "offline";

            const savedMessage = await Message.create({
                from: senderEmail,
                to: targetEmail,
                message: enc ? "" : text,

                replyTo,
                replyText: enc ? "" : replyText,
                replySender: enc ? "" : replySender,
              
                messageType: enc ? "encrypted" : safeMessageType,
                mediaUrl: enc ? "" : media,
                fileName: enc ? "" : fileName,
                latitude: enc ? null : latitude,
                longitude: enc ? null : longitude,
                locationName: enc ? "" : locationName,
                isLive: enc ? false : isLive,
                liveLocationId: enc ? "" : liveLocationId,
                expiresAt: enc ? null : expiresAt,
                clientMessageId: String(clientMessageId || ""),
                status: deliveryStatus,

                forwarded,
                isEncrypted: enc,
                encryptionVersion: enc ? (Number(encryptionVersion) || 1) : 1,
                ciphertext: enc ? String(ciphertext) : "",
                ciphertextType: enc ? Number(ciphertextType) || 0 : 0,
                senderDeviceId: enc ? (senderDeviceId ?? null) : null,
                recipientDeviceId: enc ? (recipientDeviceId ?? null) : null,
                encryptedPayload: enc ? (encryptedPayload || null) : null
            });

            const savedDoc = serializeMessage(savedMessage);

            const payload = {
                ...savedDoc,
                user: from.name || from.email,
                fromEmail: savedDoc.from,
                toEmail: savedDoc.to
            };

            const senderSockets = Object.keys(users).filter(
                key => users[key]?.email === senderEmail
            );

            senderSockets.forEach((senderSocketId) => {
                io.to(senderSocketId).emit("receiveMessage", {
                    ...payload,
                    fromSelf: true
                });
            });

            if (receiverSockets.length > 0) {
                receiverSockets.forEach((receiverSocket) => {
                    io.to(receiverSocket).emit("receiveMessage", payload);
                });
                socket.emit("messageStatus", {
                    ok: true,
                    message: "Delivered",
                    status: "delivered",
                    clientMessageId: String(clientMessageId || ""),
                    savedMessage: savedDoc
                });
            } else {
                socket.emit("messageStatus", {
                    ok: true,
                    message: "Saved. User is offline",
                    status: "offline",
                    clientMessageId: String(clientMessageId || ""),
                    savedMessage: savedDoc
                });
            }
        } catch (err) {
            console.error("privateMessage save error:", err);
            const errMsg = String(err?.message || "").toLowerCase();
            const isSelfMessageValidation = errMsg.includes("cannot message yourself");
            socket.emit("messageStatus", {
                ok: false,
                message: isSelfMessageValidation ? "Cannot message yourself" : (err?.message || "Failed to save message")
            });
        }
    });

    socket.on("typing", async ({ to }) => {
        const sender = users[socket.id];
        const targetEmail = normalizeEmail(to);
        const senderEmail = normalizeEmail(sender?.email);

        if (!senderEmail || !targetEmail) {
            return;
        }

        if (senderEmail === targetEmail) {
            return;
        }

        // Check if sender is blocked by receiver
        const isBlocked = await BlockedUser.findOne({
            user: targetEmail,
            blockedUser: senderEmail
        });

        // Check if sender has blocked receiver
        const youBlocked = await BlockedUser.findOne({
            user: senderEmail,
            blockedUser: targetEmail
        });

        // Don't send typing indicator if blocked
        if (isBlocked || youBlocked) {
            return;
        }

        const receiverSockets = Object.keys(users).filter(
            key => users[key]?.email === targetEmail
        );
        receiverSockets.forEach(id => {
            io.to(id).emit("showTyping", {
                from: senderEmail
            });
        })
    });
    socket.on("stopTyping", async ({ to }) => {
        const sender = users[socket.id];
        const targetEmail = normalizeEmail(to);
        const senderEmail = normalizeEmail(sender?.email);

        if (!senderEmail || !targetEmail) {
            return;
        }

        if (senderEmail === targetEmail) {
            return;
        }

        // Check if sender is blocked by receiver
        const isBlocked = await BlockedUser.findOne({
            user: targetEmail,
            blockedUser: senderEmail
        });

        // Check if sender has blocked receiver
        const youBlocked = await BlockedUser.findOne({
            user: senderEmail,
            blockedUser: targetEmail
        });

        // Don't send stop typing indicator if blocked
        if (isBlocked || youBlocked) {
            return;
        }

        const receiverSockets = Object.keys(users).filter(
            key => users[key]?.email === targetEmail
        );
        receiverSockets.forEach(id => {
            io.to(id).emit("hideTyping", {
                from: senderEmail
            });
        });
    })

    socket.on("disconnect", () => {
        const user = users[socket.id];
        delete users[socket.id];

        if (!user) {
            return;
        }

        const stillOnline = Object.values(users).some(
            (activeUser) => activeUser?.email === user.email
        );

        if (!stillOnline) {
            const lastSeen = new Date();
            User.updateOne(
                { email: user.email },
                { $set: { isOnline: false, lastSeen } }
            ).catch(() => { });

            io.emit("userStatus", {
                email: user.email,
                status: "offline",
                lastSeen
            });
        }
    });

    socket.on("markSeen", async ({ messageIds, from }) => {
        const me = normalizeEmail(socket.user.email);
        const fromEmail = normalizeEmail(from);
        try {
            await Message.updateMany(
                { _id: { $in: messageIds }, to: me },
                { $set: { status: "seen" } }
            );
            
            // Notify original sender
            const senderSockets = Object.keys(users).filter(
                key => users[key]?.email === fromEmail
            );
            senderSockets.forEach(id => {
                io.to(id).emit("messagesSeen", { messageIds });
            });
        } catch (err) {
            console.log("markSeen error:", err);
        }
    });

    socket.on("deleteChat", async ({ me, withUser }) => {
        const sender = users[socket.id];
        if (!sender?.email || !withUser) return;
        try {
            await Message.deleteMany({
                $or: [
                    { from: sender.email, to: withUser },
                    { from: withUser, to: sender.email }
                ]
            });
            const allSockets = Object.keys(users).filter(
                key => users[key]?.email === sender.email ||
                    users[key]?.email === withUser
            );
            allSockets.forEach(id => {
                io.to(id).emit("chatDeleted", {
                    withUser: sender.email === users[id].email
                        ? withUser : sender.email
                });
            });
        } catch (err) {
            console.log("Delete error:", err);
        }
    });
    socket.on("groupMessage",async({groupId,message,messageType="text",mediaUrl="",fileName="",forwarded=false,replyTo = null,replyText = "",replySender = "",
    latitude = null,
    longitude = null,
    locationName = "",
    isLive = false,
    liveLocationId = "",
    expiresAt = null,
    isEncrypted = false, ciphertext = "", ciphertextType = 0, senderDeviceId = null, encryptedPayload = null, encryptionVersion = 1 })=>{

        console.log("GROUP LOCATION:", {
    messageType,
    latitude,
    longitude
});
        try{
            const group=await Group.findById(groupId);

            if(!group) return;

            const sender=socket.user.email;
            if (!group.members.includes(sender)) {
                socket.emit("messageStatus", {
                    ok: false,
                    message: "You are not a member of this group"
                });
                return;
            }
            const allowedTypes = ["text", "image", "video", "document","audio","voice","location"];

            const safeMessageType = allowedTypes.includes(messageType)
            ? messageType
            : "text";

            const media = String(mediaUrl || "");

            const enc = Boolean(isEncrypted && ciphertext);
            if (!enc) {
                if ((safeMessageType === "image" || safeMessageType === "video" || safeMessageType === "document" || safeMessageType === "audio" || safeMessageType === "voice") && !media) {
                    socket.emit("messageStatus", { ok: false, message: "Media payload missing" });
                    return;
                }
            } else if (typeof ciphertext !== "string" || !ciphertext.trim()) {
                socket.emit("messageStatus", { ok: false, message: "Encrypted payload missing" });
                return;
            }

            const saved=await Message.create({
                from:sender,
                to:groupId,
                message: enc ? "" : message,
                messageType: enc ? "encrypted" : safeMessageType,
                mediaUrl: enc ? "" : mediaUrl,
                fileName: enc ? "" : fileName,
                forwarded,
                replyTo,
                replyText: enc ? "" : replyText,
                replySender: enc ? "" : replySender,

                latitude: enc ? null : latitude,
                longitude: enc ? null : longitude,
                locationName: enc ? "" : locationName,
                isLive: enc ? false : isLive,
                liveLocationId: enc ? "" : liveLocationId,
                expiresAt: enc ? null : expiresAt,

                isEncrypted: enc,
                encryptionVersion: enc ? (Number(encryptionVersion) || 1) : 1,
                ciphertext: enc ? String(ciphertext) : "",
                ciphertextType: enc ? Number(ciphertextType) || 0 : 0,
                senderDeviceId: enc ? (senderDeviceId ?? null) : null,
                encryptedPayload: enc ? (encryptedPayload || null) : null
            });

            const payload={
                ...serializeMessage(saved),
                groupId
            };

            group.members.forEach(member=>{
                const sockets=Object.keys(users).filter(
                    id=>users[id]?.email===member
                );
                sockets.forEach(id=>{
                    io.to(id).emit("receiveGroupMessage",payload);
                });
            });

        }catch(err){
            console.log(err);
        }
    })
    socket.on("liveLocationUpdated", (data) => {

    setMessages(prev =>

        prev.map(msg =>

            msg.liveLocationId === data.liveLocationId

                ? {

                    ...msg,

                    latitude: data.latitude,

                    longitude: data.longitude,

                    expiresAt: data.expiresAt,

                    isLive: true

                }

                : msg

        )

    );

});
   socket.on("privateLiveLocation", async ({
    to,
    latitude,
    longitude,
    liveLocationId,
    expiresAt
}) => {

    try {

       const sender = socket.user.email;
       const receiverSockets = Object.keys(users).filter(
            id => users[id]?.email === to
        );

let liveMessage = await Message.findOne({

    liveLocationId,

    from: sender,

    to

});

if (!liveMessage) {

    liveMessage = await Message.create({

        from: sender,

        to,

        message: "",

        messageType: "location",

        latitude,

        longitude,

        isLive: true,

        liveLocationId,

        expiresAt

    });
    receiverSockets.forEach(id => {

    io.to(id).emit("liveLocationStarted", {

        from: sender

    });

});

}else {

    liveMessage.latitude = latitude;

    liveMessage.longitude = longitude;

    await liveMessage.save();

}

        

  const payload = {

    _id: liveMessage._id,

    from: sender,

    to,

    messageType: "location",

    latitude,

    longitude,

    isLive: true,

    liveLocationId,

    expiresAt

};

        receiverSockets.forEach(id => {
            io.to(id).emit("liveLocationUpdated", payload);
        });

        // Send to sender's other tabs too
        const senderSockets = Object.keys(users).filter(
            id => users[id]?.email === sender
        );

        senderSockets.forEach(id => {
            io.to(id).emit("liveLocationUpdated", {
                ...payload,
                fromSelf: true
            });
        });

    } catch (err) {

        console.error(err);

    }

});
    socket.on("groupLiveLocation", async ({
    groupId,
    latitude,
    longitude,
    liveLocationId,
    expiresAt
}) => {

    try {

        const group = await Group.findById(groupId);

        if (!group) return;

        const sender = socket.user.email;

        const payload = {

            groupId,

            from: sender,

            latitude,

            longitude,

            liveLocationId,

            expiresAt

        };

        group.members.forEach(member => {

            const sockets = Object.keys(users).filter(
                id => users[id]?.email === member
            );

            sockets.forEach(id => {

                io.to(id).emit(
                    "liveLocationUpdated",
                    payload
                );

            });

        });

    } catch (err) {

        console.error(err);

    }

});
socket.on("stopLiveLocation", async ({ liveLocationId }) => {

    try {

        const message = await Message.findOne({
            liveLocationId
        });

        if (!message) return;

        message.isLive = false;

        await message.save();

        const payload = {

    liveLocationId,

    isLive: false,

    from: message.from

};

        // Group message
        let group = null;

        if (mongoose.Types.ObjectId.isValid(message.to)) {

            group = await Group.findById(message.to);

        }

        if (group) {

            group.members.forEach(member => {

                const sockets = Object.keys(users).filter(
                    id => users[id]?.email === member
                );

                sockets.forEach(id => {

                    io.to(id).emit(
                        "liveLocationStopped",
                        payload
                    );

                });

            });

        } else {

            // Private chat

            const senderSockets = Object.keys(users).filter(
                id => users[id]?.email === message.from
            );

            const receiverSockets = Object.keys(users).filter(
                id => users[id]?.email === message.to
            );

            senderSockets.forEach(id => {

                io.to(id).emit(
                    "liveLocationStopped",
                    payload
                );

            });

            receiverSockets.forEach(id => {

                io.to(id).emit(
                    "liveLocationStopped",
                    payload
                );

            });

        }

    } catch (err) {

        console.error(err);

    }

});
    socket.on("deleteForMe", async ({ messageId }) => {
    try {

        const message = await Message.findById(messageId);

        if (!message) return;

       await DeletedMessage.findOneAndUpdate(
    {
        user: socket.user.email,
        messageId
    },
    {},
    {
        upsert: true,
        new: true
    }
);
 


        socket.emit("messageDeletedForMe", {
            messageId
        });

    } catch (err) {
        console.error("Delete for me error:", err);
    }
});
    socket.on("reactMessage", async ({ messageId, emoji }) => {

    try {

        const message = await Message.findById(messageId);

        if (!message) return;

        const me = socket.user.email;

        // Find existing reaction by this user
        let action="";
        const existing = message.reactions.find(
            reaction => reaction.user === me
        );
        

        if (existing) {

            // Same emoji clicked → remove reaction
            if (existing.emoji === emoji) {

                message.reactions = message.reactions.filter(
                    reaction => reaction.user !== me
                );
                action="removed";

            } else {

                // Change reaction
                existing.emoji = emoji;
                action="changed";

            }

        } else {

            // First reaction
            message.reactions.push({
                user: me,
                name: socket.user.name,
                emoji
            });
            action="added";

        }

        await message.save();

        const payload = {
            messageId,
            reactions: message.reactions,

             reactedBy: socket.user.email,
            emoji,

    messageOwner: message.from,
     action
        };

        // ---------- GROUP ----------
        let group = null;

        if (mongoose.Types.ObjectId.isValid(message.to)) {
            group = await Group.findById(message.to);
        }

        if (group) {

            group.members.forEach(member => {

                const sockets = Object.keys(users).filter(
                    id => users[id]?.email === member
                );

                sockets.forEach(id => {
                    io.to(id).emit("messageReaction", payload);
                });

            });

        } else {

            // ---------- PRIVATE ----------
            const senderSockets = Object.keys(users).filter(
                id => users[id]?.email === message.from
            );

            const receiverSockets = Object.keys(users).filter(
                id => users[id]?.email === message.to
            );

            senderSockets.forEach(id => {
                io.to(id).emit("messageReaction", payload);
            });

            receiverSockets.forEach(id => {
                io.to(id).emit("messageReaction", payload);
            });

        }

    } catch (err) {

        console.error("Reaction error:", err);

    }

});
   socket.on("deleteForEveryone", async ({ messageId }) => {
            
    try {

        const message = await Message.findById(messageId);

        if (!message) return;

        // Only the sender can delete the message
        if (message.from !== socket.user.email) {
            return;
        }

        message.deletedForEveryone = true;
        message.deletedAt = new Date();

        await message.save();

        const payload = {
            messageId,
            deletedForEveryone: true
        };

        // Check if it's a group message
        let group=null;
      if (mongoose.Types.ObjectId.isValid(message.to)) {
    group = await Group.findById(message.to);
            }           
        if (group) {

            group.members.forEach(member => {

                const sockets = Object.keys(users).filter(
                    id => users[id]?.email === member
                );

                sockets.forEach(id => {
                    io.to(id).emit("messageDeletedForEveryone", payload);
                });

            });

        } else {

            // Private chat
            const senderSockets = Object.keys(users).filter(
                id => users[id]?.email === message.from
            );

            const receiverSockets = Object.keys(users).filter(
                id => users[id]?.email === message.to
            );

            senderSockets.forEach(id => {
                io.to(id).emit("messageDeletedForEveryone", payload);
            });

            receiverSockets.forEach(id => {
                io.to(id).emit("messageDeletedForEveryone", payload);
            });

        }

    } catch (err) {
    console.error("========== DELETE FOR EVERYONE ERROR ==========");
    console.error(err);
    console.error(err.stack);
    console.error("===============================================");
}
   });

    socket.on("editMessage",async({messageId,newMessage})=>{
        try{
            const message=await Message.findById(messageId);
              if(!message) return;
            if (message.from !== socket.user.email) {
                return;
                }
            if (!newMessage.trim()) {
            socket.emit("editFailed", {
          message: "Message cannot be empty"
                     });
                return;
}

          

            message.message=newMessage;
            message.edited=true;
            await message.save();

          const senderSockets = Object.keys(users).filter(
    id => users[id]?.email === message.from
);

const receiverSockets = Object.keys(users).filter(
    id => users[id]?.email === message.to
);

const payload = {
    messageId,
    message: message.message,
    edited: true
};

// Check whether "to" is a group ID
   let group=null;
      if (mongoose.Types.ObjectId.isValid(message.to)) {
    group = await Group.findById(message.to);
            }    

if (group) {

    // Group message
    group.members.forEach(member => {

        const sockets = Object.keys(users).filter(
            id => users[id]?.email === member
        );

        sockets.forEach(id => {
            io.to(id).emit("messageEdited", payload);
        });

    });

} else {

    // Private message
    const senderSockets = Object.keys(users).filter(
        id => users[id]?.email === message.from
    );

    const receiverSockets = Object.keys(users).filter(
        id => users[id]?.email === message.to
    );

    senderSockets.forEach(id => {
        io.to(id).emit("messageEdited", payload);
    });

    receiverSockets.forEach(id => {
        io.to(id).emit("messageEdited", payload);
    });

}
        }catch(err){
            console.error("Edit message error:",err);
        }
    });
    socket.on("groupSenderKeyDistribution", async ({ groupId, distributionId, distributionMessage, senderDeviceId }) => {
        try {
            const group = await Group.findById(groupId);
            if (!group || !group.members.includes(socket.user.email)) return;
            group.members.forEach(member => {
                const sockets = Object.keys(users).filter(id => users[id]?.email === member);
                sockets.forEach(id => {
                    io.to(id).emit("groupSenderKeyDistribution", {
                        groupId,
                        from: socket.user.email,
                        senderDeviceId: senderDeviceId || null,
                        distributionId,
                        distributionMessage
                    });
                });
            });
        } catch (e) { console.error("groupSenderKeyDistribution error", e); }
    });

    registerCallSocket(
    io,
    socket,
    users
);
}
);
app.get("/search", requireAuth, async (req, res) => {
    const me = normalizeEmail(req.user.email);
    const query = req.query.q;
    try {
        let foundUsers;
        if (!query) {
            foundUsers = await User.find({});
        } else {
            foundUsers = await User.find({
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { email: { $regex: query, $options: "i" } }
                ]
            });
        }

        const enhancedUsers = await Promise.all(foundUsers.map(async (u) => {
            const sanitized = sanitizeUser(u);
            const otherEmail = normalizeEmail(sanitized.email);
            if (otherEmail === me) return null;

            const [lastMsg, unreadCount] = await Promise.all([
                Message.findOne({
                    $or: [
                        { from: me, to: otherEmail },
                        { from: otherEmail, to: me }
                    ]
                }).sort({ createdAt: -1 }),
                Message.countDocuments({
                    from: otherEmail,
                    to: me,
                    status: { $ne: "seen" }
                })
            ]);

         return {
    ...sanitized,
    lastMessage: lastMsg ? serializeMessage(lastMsg) : null,
    lastMessageTime: lastMsg ? lastMsg.createdAt : null,
    unreadCount: unreadCount || 0
};
        }));
        enhancedUsers.sort((a, b) => {

    const t1 = a?.lastMessageTime
        ? new Date(a.lastMessageTime).getTime()
        : 0;

    const t2 = b?.lastMessageTime
        ? new Date(b.lastMessageTime).getTime()
        : 0;

    return t2 - t1;

});

        res.json(enhancedUsers.filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})
app.get("/messages", requireAuth, async (req, res) => {
    const me = req.user.email;
    const withUser = normalizeEmail(req.query.with);

    if (!me || !withUser) {
        return res.status(400).json({ message: "me and with are required" });
    }

    try {
       const deletedMessages = await DeletedMessage.find({
    user: req.user.email
});

const deletedIds = deletedMessages.map(
    item => item.messageId
);

const messages = await Message.find({

    _id: {
        $nin: deletedIds
    },

    $or: [
        {
            from: req.user.email,
            to: withUser
        },
        {
            from: withUser,
            to: req.user.email
        }
    ]

}).sort({
    createdAt: 1
});
        res.json(
    messages.map(msg => ({
        _id: msg._id,
        from: msg.from,
        to: msg.to,
        message: msg.message,

        replyTo: msg.replyTo,
        replyText: msg.replyText,
        replySender: msg.replySender,

        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl,
        fileName: msg.fileName,


        latitude: msg.latitude,
        longitude: msg.longitude,
        locationName: msg.locationName,
        isLive: msg.isLive,
        liveLocationId: msg.liveLocationId,
        expiresAt: msg.expiresAt,

        clientMessageId: msg.clientMessageId,
        status: msg.status,
        starred: msg.starred,
        edited: msg.edited,   
        forwarded: msg.forwarded,
        deletedForEveryone: msg.deletedForEveryone,
        reactions: msg.reactions,
        deletedAt: msg.deletedAt,
        createdAt: msg.createdAt
    }))
);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})
app.post("/messages", (req, res, next) => {
    console.log("POST /messages incoming:", {
        hasAuthHeader: !!req.headers.authorization
    });
    next();
}, requireAuth, async (req, res) => {
    const senderEmail = req.user.email;
    const targetEmail = normalizeEmail(req.body?.to);
const allowedTypes = ["text", "image", "video", "document", "audio", "voice"];

const safeMessageType = allowedTypes.includes(req.body?.messageType)
    ? req.body.messageType
    : "text";
    const text = String(req.body?.message || "").trim();
    const media = String(req.body?.mediaUrl || "");
    const clientMessageId = String(req.body?.clientMessageId || "");

    console.log("POST /messages received:", {
        senderEmail,
        targetEmail,
        messageType: safeMessageType,
        clientMessageId
    });

    if (!senderEmail || !targetEmail) {
        return res.status(400).json({ ok: false, message: "Invalid sender or receiver" });
    }

    if (senderEmail === targetEmail) {
        return res.status(400).json({ ok: false, message: "Cannot message yourself" });
    }

    if (safeMessageType === "text" && !text) {
        return res.status(400).json({ ok: false, message: "Message cannot be empty" });
    }

    if (safeMessageType === "media" && !media) {
        return res.status(400).json({ ok: false, message: "Media payload missing" });
    }

    try {
        const [isBlocked, youBlocked] = await Promise.all([
            BlockedUser.findOne({ user: targetEmail, blockedUser: senderEmail }),
            BlockedUser.findOne({ user: senderEmail, blockedUser: targetEmail })
        ]);

        if (isBlocked) {
            return res.status(403).json({ ok: false, message: "You are blocked by this user." });
        }

        if (youBlocked) {
            return res.status(403).json({ ok: false, message: "You have blocked this user. Unblock to send messages." });
        }

        const receiverOnline = getOnlineEmails().includes(targetEmail);
        const savedMessage = await Message.create({
            from: senderEmail,
            to: targetEmail,
            message: text,
            messageType: safeMessageType,
            mediaUrl: media,
            clientMessageId,
            status: receiverOnline ? "delivered" : "offline"
        });

        const savedDoc = serializeMessage(savedMessage);
        const payload = {
            _id: savedDoc._id,
            user: req.user.name || senderEmail,
            fromEmail: savedDoc.from,
            toEmail: savedDoc.to,
            message: savedDoc.message,
            messageType: savedDoc.messageType,
            mediaUrl: savedDoc.mediaUrl,
            createdAt: savedDoc.createdAt,
            clientMessageId: savedDoc.clientMessageId,
            status: savedDoc.status,
            forwarded: savedDoc.forwarded
        };

        const receiverSockets = Object.keys(users).filter(
            key => users[key]?.email === targetEmail
        );
        const senderSockets = Object.keys(users).filter(
            key => users[key]?.email === senderEmail
        );

        senderSockets.forEach((senderSocketId) => {
            io.to(senderSocketId).emit("receiveMessage", {
                ...payload,
                fromSelf: true
            });
        });

        if (receiverSockets.length > 0) {
            receiverSockets.forEach((receiverSocket) => {
                io.to(receiverSocket).emit("receiveMessage", payload);
            });
        }

        return res.status(201).json({
            ok: true,
            message: "Message saved",
            savedMessage: savedDoc
        });
    } catch (err) {
        console.error("POST /messages save error:", err);
        const errMsg = String(err?.message || "").toLowerCase();
        const isSelfMessageValidation = errMsg.includes("cannot message yourself");
        if (isSelfMessageValidation) {
            return res.status(400).json({ ok: false, message: "Cannot message yourself" });
        }
        return res.status(500).json({ ok: false, message: err?.message || "Failed to save message" });
    }
});

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const safeName = String(name || "").trim();
        const safeEmail = normalizeEmail(email);

        if (safeName.length < 2) {
            return res.status(400).json({ message: "Name must be at least 2 characters" });
        }

        if (!/^\S+@\S+\.\S+$/.test(safeEmail)) {
            return res.status(400).json({ message: "Invalid email" });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: "Password must be 8+ digits" });
        }

        const existingUser = await User.findOne({ email: safeEmail });

        if (existingUser) {
            return res.json({ message: "User already exists" });
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const newUser = new User({
            name: safeName,
            email: safeEmail,
            password: hashedPassword,
            isOnline: false,
            lastSeen: null
        });
        await newUser.save();
        res.json({ message: "Signup successful", user: sanitizeUser(newUser) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})
app.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    try {
        const safeEmail = normalizeEmail(email);
        const user = await User.findOne({ email: safeEmail });

        if (!user) {
            logLoginAttempt(safeEmail, false, ip);
            // Use generic message to prevent user enumeration
            return res.json({ message: "Invalid credentials" });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.json({
                message: "Account locked. Try later."
            });
        }

        if (!user.password) {
            logLoginAttempt(safeEmail, false, ip);
            return res.json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 15 * 60 * 1000;
            }
            await user.save();
            logLoginAttempt(safeEmail, false, ip);
            return res.json({ message: "Invalid credentials" });
        }

        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
        logLoginAttempt(safeEmail, true, ip);

        // Require JWT_SECRET in production
        if (!jwtSecret) {
            return res.status(500).json({ error: "JWT secret not set" });
        }

        await User.updateOne(
            { email: safeEmail },
            { $set: { isOnline: true } }
        );

        const token = jwt.sign(
            { email: user.email, name: user.name },
            jwtSecret,
            { expiresIn: "1h" }
        );
        res.json({ message: "Login successful", user: sanitizeUser(user), token: token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/auth/google", async (req, res) => {
    try {
        const { credential, accessToken, code } = req.body || {};
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId) {
            return res.status(500).json({ message: "Google client ID not configured" });
        }

        let email = "";
        let name = "";
        let picture = "";
        let sub = "";

        if (credential && typeof credential === "string") {
            // Verify ID Token using google-auth-library
            const googleClient = new OAuth2Client(clientId);
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: credential,
                    audience: clientId
                });
                const payload = ticket.getPayload();
                if (!payload) return res.status(401).json({ message: "Invalid Google token" });
                const emailVerified = payload.email_verified === true || payload.email_verified === "true";
                if (!payload.email || !emailVerified) {
                    return res.status(401).json({ message: "Google email not verified" });
                }
                email = normalizeEmail(payload.email);
                name = String(payload.name || email.split("@")[0] || "User").trim().slice(0, 80);
                picture = typeof payload.picture === "string" ? payload.picture : "";
                sub = String(payload.sub || "");
            } catch (verifyErr) {
                console.error("Google token verification failed:", verifyErr.message);
                return res.status(401).json({ message: "Invalid Google token" });
            }
        } else if (accessToken && typeof accessToken === "string") {
            // Verify access token & fetch user profile from Google's userinfo endpoint
            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!userInfoRes.ok) {
                return res.status(401).json({ message: "Failed to fetch Google user profile" });
            }
            const userInfo = await userInfoRes.json();
            const emailVerified = userInfo.email_verified === true || userInfo.email_verified === "true";
            if (!userInfo.email || !emailVerified) {
                return res.status(401).json({ message: "Google email not verified" });
            }
            email = normalizeEmail(userInfo.email);
            name = String(userInfo.name || email.split("@")[0] || "User").trim().slice(0, 80);
            picture = typeof userInfo.picture === "string" ? userInfo.picture : "";
            sub = String(userInfo.sub || "");
        } else if (code && typeof code === "string") {
            const oauth2Client = new OAuth2Client(clientId, clientSecret, "postmessage");
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            if (!userInfoRes.ok) {
                return res.status(401).json({ message: "Failed to fetch Google user profile" });
            }
            const userInfo = await userInfoRes.json();
            const emailVerified = userInfo.email_verified === true || userInfo.email_verified === "true";
            if (!userInfo.email || !emailVerified) {
                return res.status(401).json({ message: "Google email not verified" });
            }
            email = normalizeEmail(userInfo.email);
            name = String(userInfo.name || email.split("@")[0] || "User").trim().slice(0, 80);
            picture = typeof userInfo.picture === "string" ? userInfo.picture : "";
            sub = String(userInfo.sub || "");
        } else {
            return res.status(400).json({ message: "Missing Google credential or access token" });
        }

        let user = await User.findOne({ email });
        if (!user) {
            const randomPassword = crypto.randomBytes(24).toString("hex");
            user = await User.create({
                name,
                email,
                password: await bcrypt.hash(randomPassword, 10),
                photo: picture,
                googleId: sub,
                authProvider: "google",
                isOnline: true,
                lastSeen: null
            });
        } else {
            const updates = { isOnline: true, lastSeen: null };
            if (!user.googleId && sub) updates.googleId = sub;
            if (!user.photo && picture) updates.photo = picture;
            if (user.googleId) updates.authProvider = "google";
            user = await User.findOneAndUpdate({ email }, { $set: updates }, { new: true });
        }

        if (!jwtSecret) {
            return res.status(500).json({ error: "JWT secret not set" });
        }
        const token = jwt.sign(
            { email: user.email, name: user.name },
            jwtSecret,
            { expiresIn: "7d" }
        );
        return res.json({ message: "Login successful", user: sanitizeUser(user), token });
    } catch (err) {
        console.error("Google auth error:", err);
        return res.status(500).json({ message: "Google authentication failed" });
    }
});
app.post("/forgot-password",async(req,res)=>{
    try {
        const safeEmail = normalizeEmail(req.body?.email);
        const user=await User.findOne({ email: safeEmail });
        if(!user){
            return res.json({message:"user not found"});
        }
        const token=crypto.randomBytes(32).toString("hex");
        user.resetToken=token;
        user.resetTokenExpiry=Date.now()+10*60*1000;
        await user.save();
        res.json({
            message:"Reset token generated",
            token:token
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to generate reset token" });
    }
})
app.post("/reset-password",async(req,res)=>{
    try {
        const {token,newPassword}=req.body;
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ message: "Password must be 8+ digits" });
        }
        const user=await User.findOne({
            resetToken:token,
            resetTokenExpiry:{$gt:Date.now()}
        });
        if(!user){
            return res.json({message:"Invalid or expired token"});
        }
        const hashed=await bcrypt.hash(newPassword,10);
        user.password=hashed;
        user.resetToken=null;
        user.resetTokenExpiry=null;
        await user.save();
        res.json({message:"Password reset successful"});
    } catch (err) {
        res.status(500).json({ message: "Failed to reset password" });
    }
})

app.post("/profile/photo", requireAuth, async (req, res) => {
    try {
        const photoData = String(req.body?.photoData || "");
        const imageMatch = photoData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
        if (!imageMatch) {
            return res.status(400).json({ message: "Only JPG, PNG, and WebP images are supported" });
        }
        const imageBytes = Buffer.from(imageMatch[2], "base64");
        if (imageBytes.length > 5 * 1024 * 1024) {
            return res.status(413).json({ message: "Profile photos must be smaller than 5 MB" });
        }

        const updated = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: { photo: photoData } },
            { new: true }
        );
        io.emit("profilePhotoUpdated", {
    email: updated.email,
    photo: updated.photo
});
        res.json({ message: "Profile photo updated", user: sanitizeUser(updated) });
    } catch (err) {
        res.status(500).json({ message: "Failed to update profile photo" });
    }
});

const deletePhotoHandler = async (req, res) => {
    try {
        const updated = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: { photo: "" } },
            { new: true }
        );
        io.emit("profilePhotoUpdated", {
            email: updated.email,
            photo: ""
        });
        res.json({ message: "Profile photo deleted", user: sanitizeUser(updated) });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete profile photo" });
    }
};

app.delete("/profile/photo", requireAuth, deletePhotoHandler);
app.post("/profile/photo/delete", requireAuth, deletePhotoHandler);

// Profile Update (Name, About, Phone)
const updateProfileHandler = async (req, res) => {
    try {
        const { name, about, phone } = req.body;
        const updates = {};

        if (typeof name === "string") {
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                return res.status(400).json({ message: "Name must be at least 2 characters" });
            }
            updates.name = trimmedName;
        }

        if (typeof about === "string") {
            updates.about = about.trim();
        }

        if (typeof phone === "string") {
            updates.phone = phone.trim();
        }

        const updated = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: updates },
            { new: true }
        );

        res.json({ message: "Profile updated successfully", user: sanitizeUser(updated) });
    } catch (err) {
        res.status(500).json({ message: "Failed to update profile" });
    }
};

app.post("/profile/update", requireAuth, updateProfileHandler);
app.put("/profile", requireAuth, updateProfileHandler);
app.post("/profile/name", requireAuth, updateProfileHandler);
app.post("/profile/about", requireAuth, updateProfileHandler);
app.post("/profile/phone", requireAuth, updateProfileHandler);

// Mutual Groups
app.get("/mutual-groups", requireAuth, async (req, res) => {
    try {
        const me = req.user.email;
        const otherUser = normalizeEmail(req.query.with);
        if (!otherUser) {
            return res.status(400).json({ message: "Target user is required" });
        }
        const mutual = await Group.find({
            members: { $all: [me, otherUser] }
        });
        res.json(mutual);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Report User
app.post("/report", requireAuth, async (req, res) => {
    try {
        const reporter = req.user.email;
        const reportedUser = normalizeEmail(req.body.reportedUser || req.body.email);
        const reason = String(req.body.reason || "").trim();

        if (!reportedUser || !reason) {
            return res.status(400).json({ message: "Reported user and reason are required" });
        }

        const report = await Report.create({
            reporter,
            reportedUser,
            reason
        });

        res.json({ message: "User reported successfully", report });
    } catch (err) {
        res.status(500).json({ message: "Failed to submit report" });
    }
});

// Block/Unblock REST toggle
app.post("/block/toggle", requireAuth, async (req, res) => {
    try {
        const me = req.user.email;
        const target = normalizeEmail(req.body.target || req.body.other || req.body.email);
        if (!target) return res.status(400).json({ message: "Target user is required" });

        const exists = await BlockedUser.findOne({ user: me, blockedUser: target });
        if (exists) {
            await BlockedUser.deleteOne({ user: me, blockedUser: target });
            return res.json({ blocked: false, message: "User unblocked" });
        } else {
            await BlockedUser.create({ user: me, blockedUser: target });
            return res.json({ blocked: true, message: "User blocked" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get other user's profile
app.get("/user/profile/:email", requireAuth, async (req, res) => {
    try {
        const targetEmail = normalizeEmail(req.params.email);
        const userDoc = await User.findOne({ email: targetEmail });
        if (!userDoc) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: sanitizeUser(userDoc) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Call History API
app.get("/call-history", requireAuth, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const targetEmail = req.query.with ? normalizeEmail(req.query.with) : null;
        let query;
        if (targetEmail) {
            query = {
                $or: [
                    { caller: userEmail, receiver: targetEmail },
                    { caller: targetEmail, receiver: userEmail }
                ]
            };
        } else {
            query = {
                $or: [
                    { caller: userEmail },
                    { receiver: userEmail }
                ]
            };
        }
        const history = await CallHistory.find(query).sort({ startedAt: -1, createdAt: -1 }).limit(50);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch call history", error: err.message });
    }
});

// Versioned encrypted cloud backup API
app.post("/api/backups", requireAuth, async (req, res) => {
    let backupRecord;
    try {
        const owner = normalizeEmail(req.user.email);
        const includeMedia = req.body?.includeMedia !== false;
        const payload = await collectBackupData(owner, {
            withUser: req.body?.withUser,
            groupId: req.body?.groupId,
            includeMedia,
            settings: req.body?.settings
        });
        const encrypted = encryptBackup(owner, payload);
        const storageKey = `backups/${owner}/${new mongoose.Types.ObjectId()}.backup`;
        backupRecord = await Backup.create({
            owner,
            storageKey,
            status: "uploading",
            version: BACKUP_VERSION,
            size: encrypted.length,
            includeMedia,
            conversationCount: payload.conversations.length,
            messageCount: payload.messages.length,
            mediaCount: payload.media.length
        });
        await uploadBackup(owner, storageKey, encrypted);
        backupRecord.status = "ready";
        await backupRecord.save();
        res.status(201).json({
            id: backupRecord._id,
            status: backupRecord.status,
            createdAt: backupRecord.createdAt,
            size: backupRecord.size,
            includeMedia,
            conversationCount: backupRecord.conversationCount,
            messageCount: backupRecord.messageCount,
            mediaCount: backupRecord.mediaCount
        });
    } catch (err) {
        if (backupRecord) {
            backupRecord.status = "failed";
            backupRecord.error = err.message;
            await backupRecord.save().catch(() => {});
        }
        res.status(503).json({ message: "Cloud backup failed", error: err.message });
    }
});

app.get("/api/backups", requireAuth, async (req, res) => {
    const backups = await Backup.find({
        owner: normalizeEmail(req.user.email),
        status: { $ne: "failed" }
    }).sort({ createdAt: -1 }).select("-storageKey -error").lean();
    res.json(backups);
});

app.get("/api/backups/:id", requireAuth, async (req, res) => {
    const backup = await Backup.findOne({
        _id: req.params.id,
        owner: normalizeEmail(req.user.email),
        status: "ready"
    }).select("-storageKey -error").lean();
    if (!backup) return res.status(404).json({ message: "Backup not found" });
    res.json(backup);
});

app.get("/api/backups/:id/download", requireAuth, async (req, res) => {
    try {
        const owner = normalizeEmail(req.user.email);
        const backup = await Backup.findOne({
            _id: req.params.id,
            owner,
            status: "ready"
        });
        if (!backup) return res.status(404).json({ message: "Backup not found" });
        const payload = decryptBackup(owner, await downloadBackup(backup.storageKey));
        res.json(payload);
    } catch (err) {
        res.status(422).json({ message: "Backup could not be verified", error: err.message });
    }
});

app.post("/api/backups/:id/restore", requireAuth, async (req, res) => {
    try {
        const owner = normalizeEmail(req.user.email);
        const backup = await Backup.findOne({
            _id: req.params.id,
            owner,
            status: "ready"
        });
        if (!backup) return res.status(404).json({ message: "Backup not found" });
        const result = await restoreBackupData(owner, decryptBackup(owner, await downloadBackup(backup.storageKey)));
        res.json({ message: "Backup restored", ...result });
    } catch (err) {
        res.status(422).json({ message: "Backup restore failed", error: err.message });
    }
});

app.post("/api/backups/import", requireAuth, async (req, res) => {
    try {
        const result = await restoreBackupData(
            normalizeEmail(req.user.email),
            req.body?.backup
        );
        res.json({ message: "Backup imported", ...result });
    } catch (err) {
        res.status(422).json({ message: "Backup import failed", error: err.message });
    }
});

// Legacy local JSON Chat Backup API
app.get("/chat/backup", requireAuth, async (req, res) => {
    try {
        const me = normalizeEmail(req.user.email);
        const target = req.query.with ? normalizeEmail(req.query.with) : null;
        const groupId = req.query.groupId;
        let query;
        if (groupId) {
            const group = await Group.findOne({ _id: groupId, members: me }).select("_id").lean();
            if (!group) {
                return res.status(403).json({ message: "You are not a member of this group" });
            }
            query = { to: String(group._id) };
        } else if (target) {
            query = {
                $or: [
                    { from: me, to: target },
                    { from: target, to: me }
                ]
            };
        } else {
            const groups = await Group.find({ members: me }).select("_id").lean();
            const groupIds = groups.map((group) => String(group._id));
            query = {
                $or: [{ from: me }, { to: me }, ...(groupIds.length ? [{ to: { $in: groupIds } }] : [])]
            };
        }
        const msgs = await Message.find(query).sort({ createdAt: 1 });
        res.json({
            backupDate: new Date(),
            user: me,
            target: target || groupId || "all",
            count: msgs.length,
            mediaCount: msgs.filter(isMediaMessage).length,
            messages: msgs
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to backup chat", error: err.message });
    }
});

// Chat Restore API
app.post("/chat/restore", requireAuth, async (req, res) => {
    try {
        const { messages: restoreMsgs } = req.body;
        if (!Array.isArray(restoreMsgs) || restoreMsgs.length === 0) {
            return res.status(400).json({ message: "No valid messages array provided to restore" });
        }
        let insertedCount = 0;
        for (const m of restoreMsgs) {
            if (m.message || m.mediaUrl) {
                const existing = m._id ? await Message.findById(m._id) : null;
                if (!existing) {
                    await Message.create({
                        from: m.from,
                        to: m.to,
                        groupId: m.groupId,
                        message: m.message || "",
                        messageType: m.messageType || "text",
                        mediaUrl: m.mediaUrl || "",
                        fileName: m.fileName || "",
                        createdAt: m.createdAt || new Date()
                    });
                    insertedCount++;
                }
            }
        }
        res.json({ message: "Chat restored successfully", insertedCount });
    } catch (err) {
        res.status(500).json({ message: "Failed to restore chat", error: err.message });
    }
});
app.post("/create-group",requireAuth,async(req,res)=>{
    try{
        const{name,members}=req.body;

        const allMembers=[...new Set([...members,req.user.email])];

        const group=await Group.create({
            name,
            members:allMembers,
            admin:req.user.email
        });
        allMembers.forEach(member=>{
            if(member===req.user.email) return;
            console.log("GROUP MEMBER:", member);
        
            const memberSockets=Object.keys(users).filter(id=>users[id]?.email===member);
                console.log("MATCHED SOCKETS:", memberSockets);
            memberSockets.forEach(id=>{
                io.to(id).emit("addedToGroup",{
                    group
                });
            })
        })
        res.json({group});
    }catch(err){
        res.status(500).json({message:err.message});
    }
});
app.post("/message/:id/star",requireAuth,async(req,res)=>{
    try{
        const message=await Message.findById(req.params.id);
        if(!message){
            return res.status(404).json({
                message:"Message not found"
            });
        }
        message.starred=!message.starred;
        await message.save();
        res.json({
            message:"Updated",
            starred:message.starred
        });
    }catch(err){
        res.status(500).json({
            message:err.message
        });
    }
})
app.get("/messages/starred",requireAuth,async(req,res)=>{
    try{
        const messages=await Message.find({
            $or:[
                {from:req.user.email},
                {to:req.user.email}
            ],
            starred:true
        }).sort({createdAt:-1});
        res.json(messages.map(msg => ({
            _id: msg._id,
            from: msg.from,
            to: msg.to,
            message: msg.message,
            replyTo: msg.replyTo,
            replyText: msg.replyText,
            replySender: msg.replySender,
            messageType: msg.messageType,
            mediaUrl: msg.mediaUrl,
            clientMessageId: msg.clientMessageId,
            status: msg.status,
            starred: msg.starred,
            edited: msg.edited,
            forwarded: msg.forwarded,
            createdAt: msg.createdAt
        })));
    }catch(err){
        res.status(500).json({
            message:err.message
        });
    }
})
app.get("/groups",requireAuth,async(req,res)=>{
    try{
        const groups=await Group.find({
            members:req.user.email
        });
        res.json(groups);
    } catch(err){
        res.status(500).json({message:err.message});
    }
})
//GET Group MeSSAGES
app.get("/group-messages/:groupId",requireAuth,async(req,res)=>{
    try{
        const group = await Group.findOne({
            _id: req.params.groupId,
            members: req.user.email
        }).select("_id").lean();
        if (!group) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }
        //get group id from URL
        const deletedMessages = await DeletedMessage.find({
    user: req.user.email
});

const deletedIds = deletedMessages.map(
    item => item.messageId
);

const messages = await Message.find({

    to: req.params.groupId,

    _id: {
        $nin: deletedIds
    }

}).sort({
    createdAt: 1
});//oldest first
        //send messages
        res.json(messages);
    }catch(err){
       res.status(500).json(
    messages.map(msg => ({
        _id: msg._id,
        from: msg.from,
        to: msg.to,
        message: msg.message,

        replyTo: msg.replyTo,
        replyText: msg.replyText,
        replySender: msg.replySender,

        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl,
        fileName: msg.fileName,

        clientMessageId: msg.clientMessageId,
        status: msg.status,

        starred: msg.starred,
        edited: msg.edited,
        forwarded: msg.forwarded,

        deletedForEveryone: msg.deletedForEveryone,
        reactions: msg.reactions,
        deletedAt: msg.deletedAt,

        createdAt: msg.createdAt,
        latitude: msg.latitude,
        longitude: msg.longitude,
        locationName: msg.locationName,
        isLive: msg.isLive,
        liveLocationId: msg.liveLocationId,
        expiresAt: msg.expiresAt,

    }))
);
    }
})

app.get("/media/:messageId/download", requireAuth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId).lean();
        if (!message || !message.mediaUrl) {
            return res.status(404).json({ message: "Media not found" });
        }

        const requester = normalizeEmail(req.user.email);
        let authorized = message.from === requester || message.to === requester;
        if (!authorized) {
            const group = await Group.findOne({
                _id: message.to,
                members: requester
            }).select("_id").lean();
            authorized = Boolean(group);
        }
        if (!authorized) {
            return res.status(403).json({ message: "You are not authorized to access this media" });
        }

        const match = String(message.mediaUrl).match(/^data:([^;,]+)(?:;[^,]+)*,([\s\S]+)$/);
        if (!match) {
            return res.status(502).json({ message: "Media storage format is unsupported" });
        }
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        const filename = String(message.fileName || `media-${message._id}`).replace(/["\r\n]/g, "_");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({ message: "Unable to download media" });
    }
});
app.get("/group/:groupId", requireAuth, async (req, res) => {
    try {

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        // Fetch complete details of all members
        const members = await User.find(
            {
                email: { $in: group.members }
            },
            {
                name: 1,
                email: 1,
                photo: 1,
                lastSeen: 1,
                isOnline: 1,
                _id: 0
            }
        );

        res.json({
            ...group.toObject(),
            members
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }
});
app.post("/group/:groupId/leave",requireAuth,async(req,res)=>{
    try{
        const {groupId}=req.params;
        const group=await Group.findById(groupId);
        if(!group){
            return res.status(404).json({
                message:"Group not found"
            });
        }
        //Admin cannot leave
        if(group.admin===req.user.email){
            return res.status(400).json({
                message:"Admin cannot leave the group"
            });
        }
        group.members=group.members.filter(
            member=>member!==req.user.email
        );
        await group.save();
        const adminSockets=Object.keys(users).filter(
            id=>users[id]?.email===group.admin
        );
        adminSockets.forEach(id=>{
            io.to(id).emit("groupMemberLeft",{
                groupName:group.name,
                member:req.user.email
            });
        })
        res.json({
            message:"Left group successfully"
        });

    }catch(err){
        res.status(500).json({
            message:err.message
        });
    }
})
app.post("/group/:groupId/add-member",requireAuth,async(req,res)=>{
    try{
        const {groupId}=req.params;
        const {email}=req.body;
        const group=await Group.findById(groupId);
        if(!group){
            return res.status(404).json({
                message:"Group not found"
            });
        }
        //only admin can add members
        if(group.admin!==req.user.email){
            return res.status(403).json({
                message:"Only admin can add members"
            });
        }
        //Already exists
        if(group.members.includes(email)){
            return res.status(400).json({
                message:"User already in group"
            });
        }
       group.members.push(email);
await group.save();

const memberSockets = Object.keys(users).filter(
    id => users[id]?.email === email
);

memberSockets.forEach(id => {
    io.to(id).emit("addedToGroup", {
        group
    });
});

res.json({
    message: "Member added successfully",
    group
});

} catch (err) {
    res.status(500).json({
        message: err.message
    });
}
});

app.post("/group/:groupId/remove-member",requireAuth,async(req,res)=>{
    try{
        const {email}=req.body;
        const group=await Group.findById(req.params.groupId);
        if(!group){
            return res.status(404).json({
                message:"Group not found"
            });
        }
        //Only admin can remove
        if(group.admin!==req.user.email){
            return res.status(403).json({
                message:"Only admin can remove members"
            });
        }
        //Admin can't remove themselves
        if(email===group.admin){
            return res.status(400).json({
                message:"Admin cannot remove themselves"
            });
        }
        group.members=group.members.filter(
            member=>member!==email
        );
        await group.save();
        //Notify removed user
        const memberSockets=Object.keys(users).filter(
            id=>users[id]?.email===email
        );
        memberSockets.forEach(id=>{
            io.to(id).emit("removeFromGroup",{
                groupId:group._id,
                groupName:group.name
            });
        });
        res.json({
            message:"Member removed successfully",
            group
        });

    }catch(error){
         console.error(error);
        res.status(500).json({
            message:error.message
        });
    }
})
app.post("/group/:groupId/photo",requireAuth,async(req,res)=>{
    try{
        const {photo}=req.body;
        const group=await Group.findById(req.params.groupId);
        if(!group){
            return res.status(404).json({
                message:"Group not found"
            });
        }
        if(group.admin!==req.user.email){
            return res.status(403).json({
                message:"Only admin can change group photo"
            });
        }
        group.photo=photo;
        await group.save();
        res.json({
            message:"Group photo updated successfully",
            photo:group.photo
        });
     }catch(err){
        res.status(500).json({
            message:err.message
        });
     }
})
app.post("/archive",requireAuth,async(req,res)=>{
    try{
        const {chatId,chatType}=req.body;
        const exists=await ArchivedChat.findOne({
            user:req.user.email,
            chatId
        });
        if(exists){
            return res.json({
                message:"Already archived"
            });
        }
        await ArchivedChat.create({
            user:req.user.email,
            chatId,
            chatType
        });
        res.json({
            message:"Archived successfully"
        });
    }catch(error){
        res.status(500).json({
            message:error.message
        });
    }
})
app.post("/unarchive",requireAuth,async(req,res)=>{
    try{
        const {chatId}=req.body;
        await ArchivedChat.deleteOne({
            user:req.user.email,
            chatId
        });
        res.json({
            message:"Chat restored"
        });
    }catch(err){
        res.status(500).json({
            message:err.message
        });
    }
})
app.get("/archived",requireAuth,async(req,res)=>{
    try{
        const chats=await ArchivedChat.find({
            user:req.user.email
        });
        res.json(chats);
    }catch(err){
        res.status(500).json({
            message:err.message
        })
    }
})


app.get("/analytics", requireAuth, async (req, res) => {
    try {
        const [totalUsers, totalMessages, totalBlocks, mySent, myReceived] = await Promise.all([
            User.countDocuments({}),
            Message.countDocuments({}),
            BlockedUser.countDocuments({}),
            Message.countDocuments({ from: req.user.email }),
            Message.countDocuments({ to: req.user.email })
        ]);

        res.json({
            totalUsers,
            totalMessages,
            totalBlocks,
            mySent,
            myReceived
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to load analytics" });
    }
});

app.get("/me", requireAuth, async (req, res) => {
    try {
        const me = await User.findOne({ email: req.user.email });
        if (!me) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: sanitizeUser(me) });
    } catch (err) {
        res.status(500).json({ message: "Failed to load profile" });
    }
})
app.use("/api/ai", aiRoutes);
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
