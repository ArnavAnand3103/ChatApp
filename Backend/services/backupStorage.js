import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const algorithm = "aes-256-gcm";
const version = 1;
const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));

const isLocalStorage = () => (process.env.BACKUP_STORAGE || "local").toLowerCase() === "local";

const localBackupPath = (key) => {
    const root = path.resolve(
        serviceDirectory,
        "..",
        process.env.BACKUP_LOCAL_DIR || "backups"
    );
    const filename = `${crypto.createHash("sha256").update(key).digest("hex")}.backup`;
    return path.join(root, filename);
};

const getKey = (owner) => {
    const secret = process.env.BACKUP_ENCRYPTION_KEY;
    if (!secret) throw new Error("BACKUP_ENCRYPTION_KEY is not configured");
    return crypto.scryptSync(secret, `chatapp-backup:${owner}`, 32);
};

const getClient = () => {
    if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET is not configured");
    return new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
        }
    });
};

export const encryptBackup = (owner, payload) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, getKey(owner), iv);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(payload), "utf8"),
        cipher.final()
    ]);
    return Buffer.concat([
        Buffer.from(`CHATAPP_BACKUP:${version}\n`),
        iv,
        cipher.getAuthTag(),
        encrypted
    ]);
};

export const decryptBackup = (owner, buffer) => {
    const header = Buffer.from(`CHATAPP_BACKUP:${version}\n`);
    if (!buffer.subarray(0, header.length).equals(header)) {
        throw new Error("Unsupported or invalid backup format");
    }
    const ivStart = header.length;
    const iv = buffer.subarray(ivStart, ivStart + 12);
    const tag = buffer.subarray(ivStart + 12, ivStart + 28);
    const encrypted = buffer.subarray(ivStart + 28);
    const decipher = crypto.createDecipheriv(algorithm, getKey(owner), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]).toString("utf8"));
};

export const uploadBackup = async (owner, key, body) => {
    if (isLocalStorage()) {
        const filePath = localBackupPath(key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, body);
        return;
    }

    await getClient().send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/octet-stream",
        ServerSideEncryption: process.env.S3_SSE || undefined
    }));
};

export const downloadBackup = async (key) => {
    if (isLocalStorage()) {
        return fs.readFile(localBackupPath(key));
    }

    const response = await getClient().send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key
    }));
    const chunks = [];
    for await (const chunk of response.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
};

export const BACKUP_VERSION = version;
