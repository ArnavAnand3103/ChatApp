import { fetchE2EEDevices } from "./api";

const norm = (v) => String(v || "").trim().toLowerCase();
const hasBridge = () => typeof window !== "undefined" && window.chatAppNative;
const groupDistKey = (groupId) => `e2ee_group_dist_${groupId}`;

export const e2eeAvailable = () => hasBridge();

export async function getMyDeviceId(email) {
    if (!hasBridge()) return null;
    const bundle = await window.chatAppNative.ensureE2EEDevice(norm(email));
    return bundle?.deviceId || null;
}

export async function encryptPrivateForUser({ token, fromEmail, toEmail, plaintext }) {
    if (!hasBridge()) throw new Error("E2EE not available");
    const data = await fetchE2EEDevices(token, toEmail, true);
    const devices = data?.devices || [];
    if (!devices.length) throw new Error("Recipient has no E2EE device");
    const bundle = devices[0];
    const res = await window.chatAppNative.encryptPrivate({
        accountId: norm(fromEmail),
        remoteEmail: norm(toEmail),
        remoteBundle: bundle,
        plaintext
    });
    const senderDeviceId = await getMyDeviceId(fromEmail);
    return { ...res, senderDeviceId, recipientDeviceId: bundle.deviceId };
}

export async function decryptPrivateForMe({ myEmail, fromEmail, senderDeviceId, ciphertext, ciphertextType }) {
    if (!hasBridge()) throw new Error("E2EE not available");
    return window.chatAppNative.decryptPrivate({
        accountId: norm(myEmail),
        remoteEmail: norm(fromEmail),
        remoteDeviceId: senderDeviceId || 1,
        ciphertext,
        ciphertextType
    });
}

export async function ensureGroupSenderKey({ myEmail, groupId }) {
    if (!hasBridge()) throw new Error("E2EE not available");
    let dist = localStorage.getItem(groupDistKey(groupId));
    if (!dist) {
        const res = await window.chatAppNative.createSenderKey({ accountId: norm(myEmail), groupId: String(groupId) });
        dist = res.distributionId;
        localStorage.setItem(groupDistKey(groupId), dist);
        return { ...res, created: true };
    }
    return { distributionId: dist, created: false };
}

export function getGroupDistributionId(groupId) {
    return localStorage.getItem(groupDistKey(groupId));
}

export async function processGroupSenderKey({ myEmail, senderEmail, senderDeviceId, distributionMessage, distributionId, groupId }) {
    if (!hasBridge()) return null;
    const res = await window.chatAppNative.processSenderKey({
        accountId: norm(myEmail),
        senderEmail: norm(senderEmail),
        senderDeviceId: senderDeviceId || 1,
        distributionMessage
    });
    if (distributionId && groupId) {
        // store per-sender distribution for decrypt lookup
        localStorage.setItem(`${groupDistKey(groupId)}_${norm(senderEmail)}`, distributionId);
    }
    return res;
}

export async function encryptGroupForChat({ myEmail, groupId, plaintext }) {
    if (!hasBridge()) throw new Error("E2EE not available");
    const ensured = await ensureGroupSenderKey({ myEmail, groupId });
    const res = await window.chatAppNative.encryptGroup({
        accountId: norm(myEmail),
        distributionId: ensured.distributionId,
        plaintext
    });
    const senderDeviceId = await getMyDeviceId(myEmail);
    return { ...res, senderDeviceId, distributionId: ensured.distributionId, distribution: ensured };
}

export async function decryptGroupForMe({ myEmail, senderEmail, senderDeviceId, ciphertext }) {
    if (!hasBridge()) throw new Error("E2EE not available");
    return window.chatAppNative.decryptGroup({
        accountId: norm(myEmail),
        senderEmail: norm(senderEmail),
        senderDeviceId: senderDeviceId || 1,
        ciphertext
    });
}
