import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import * as signal from "@signalapp/libsignal-client";

const stateDirectory = path.join(os.homedir(), ".chatapp");
const statePath = (accountId) => path.join(
    stateDirectory,
    `e2ee-${crypto.createHash("sha256").update(accountId).digest("hex")}.json`
);

const b64e = (bytes) => Buffer.from(bytes).toString("base64");
const b64d = (str) => Buffer.from(String(str || ""), "base64");
const randomId = (max) => crypto.randomInt(1, max);
const norm = (v) => String(v || "").trim().toLowerCase();

async function loadState(accountId) {
    const file = statePath(norm(accountId));
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch (e) { if (e.code === "ENOENT") return null; throw e; }
}
async function saveState(accountId, state) {
    await fs.mkdir(stateDirectory, { recursive: true });
    const file = statePath(norm(accountId));
    await fs.writeFile(file, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
}

function makeStores(state) {
    state.sessions = state.sessions || {};
    state.identities = state.identities || {};
    state.senderKeys = state.senderKeys || {};
    state.privateState = state.privateState || {};
    state.privateState.preKeys = state.privateState.preKeys || [];
    state.privateState.kyberPreKeys = state.privateState.kyberPreKeys || [];

    const sessionStore = new (class extends signal.SessionStore {
        async saveSession(address, record) { state.sessions[address.toString()] = b64e(record.serialize()); }
        async getSession(address) {
            const v = state.sessions[address.toString()];
            return v ? signal.SessionRecord.deserialize(b64d(v)) : null;
        }
        async getExistingSessions(addresses) {
            const out = [];
            for (const a of addresses) { const r = await this.getSession(a); if (r) out.push(r); }
            return out;
        }
    })();

    const identityStore = new (class extends signal.IdentityKeyStore {
        async getIdentityKey() {
            return signal.PrivateKey.deserialize(b64d(state.privateState.identityPrivateKey));
        }
        async getLocalRegistrationId() { return state.publicBundle.registrationId; }
        async saveIdentity(address, key) {
            const k = address.toString();
            const existing = state.identities[k];
            const next = b64e(key.serialize());
            state.identities[k] = next;
            if (existing && existing !== next) return signal.IdentityChange.ReplacedExisting;
            return signal.IdentityChange.NewOrUnchanged;
        }
        async isTrustedIdentity(address, key, _dir) {
            const existing = state.identities[address.toString()];
            if (!existing) return true; // TOFU for demo
            return existing === b64e(key.serialize());
        }
        async getIdentity(address) {
            const v = state.identities[address.toString()];
            return v ? signal.PublicKey.deserialize(b64d(v)) : null;
        }
    })();

    const preKeyStore = new (class extends signal.PreKeyStore {
        async savePreKey(id, record) {
            const i = state.privateState.preKeys.findIndex(p => p.id === id);
            const item = { id, key: b64e(record.serialize()) };
            if (i >= 0) state.privateState.preKeys[i] = item; else state.privateState.preKeys.push(item);
        }
        async getPreKey(id) {
            const item = state.privateState.preKeys.find(p => p.id === id);
            if (!item) throw new Error(`PreKey ${id} not found`);
            return signal.PreKeyRecord.deserialize(b64d(item.key));
        }
        async removePreKey(id) {
            state.privateState.preKeys = state.privateState.preKeys.filter(p => p.id !== id);
        }
    })();

    const signedPreKeyStore = new (class extends signal.SignedPreKeyStore {
        async saveSignedPreKey(id, record) { state.privateState.signedPreKey = { id, key: b64e(record.serialize()) }; }
        async getSignedPreKey(id) {
            const spk = state.privateState.signedPreKey;
            if (!spk || spk.id !== id) throw new Error(`SignedPreKey ${id} not found`);
            return signal.SignedPreKeyRecord.deserialize(b64d(spk.key));
        }
    })();

    const kyberPreKeyStore = new (class extends signal.KyberPreKeyStore {
        async saveKyberPreKey(kyberPreKeyId, record) {
            const i = state.privateState.kyberPreKeys.findIndex(p => p.id === kyberPreKeyId);
            const item = { id: kyberPreKeyId, key: b64e(record.serialize()) };
            if (i >= 0) state.privateState.kyberPreKeys[i] = item; else state.privateState.kyberPreKeys.push(item);
        }
        async getKyberPreKey(kyberPreKeyId) {
            const item = state.privateState.kyberPreKeys.find(p => p.id === kyberPreKeyId);
            if (!item) throw new Error(`KyberPreKey ${kyberPreKeyId} not found`);
            return signal.KyberPreKeyRecord.deserialize(b64d(item.key));
        }
        async markKyberPreKeyUsed(_kyberPreKeyId, _signedPreKeyId, _baseKey) { /* keep for demo */ }
    })();

    const senderKeyStore = new (class extends signal.SenderKeyStore {
        async saveSenderKey(sender, distributionId, record) {
            const k = `${sender.toString()}::${distributionId}`;
            state.senderKeys[k] = b64e(record.serialize());
        }
        async getSenderKey(sender, distributionId) {
            const k = `${sender.toString()}::${distributionId}`;
            const v = state.senderKeys[k];
            return v ? signal.SenderKeyRecord.deserialize(b64d(v)) : null;
        }
    })();

    return { sessionStore, identityStore, preKeyStore, signedPreKeyStore, kyberPreKeyStore, senderKeyStore };
}

async function ensureDevice(accountId) {
    const id = norm(accountId);
    if (!id) throw new Error("An account identifier is required");
    await fs.mkdir(stateDirectory, { recursive: true });
    let state = await loadState(id);
    if (state && state.publicBundle && state.privateState && state.privateState.identityPrivateKey) {
        // migrate: ensure kyber exists for libsignal 0.106 bundle compatibility
        if (!state.publicBundle.kyberPreKey || !state.privateState.kyberPreKeys || state.privateState.kyberPreKeys.length === 0) {
            const identity = signal.IdentityKeyPair.deserialize(b64d(state.privateState.identityKeyPair));
            const kyberId = randomId(2147483647);
            const kyberKP = signal.KEMKeyPair.generate();
            const kyberSig = identity.privateKey.sign(kyberKP.getPublicKey().serialize());
            const kyberRec = signal.KyberPreKeyRecord.new(kyberId, Date.now(), kyberKP, kyberSig);
            state.publicBundle.kyberPreKey = {
                id: kyberId,
                publicKey: b64e(kyberKP.getPublicKey().serialize()),
                signature: b64e(kyberSig),
                createdAt: new Date().toISOString()
            };
            state.privateState.kyberPreKeys = [{ id: kyberId, key: b64e(kyberRec.serialize()) }];
            await saveState(id, state);
        }
        return state.publicBundle;
    }

    const identity = signal.IdentityKeyPair.generate();
    const signedPrivateKey = signal.PrivateKey.generate();
    const signedPublicKey = signedPrivateKey.getPublicKey();
    const signedPreKeyId = randomId(2147483647);
    const signedSignature = identity.privateKey.sign(signedPublicKey.getPublicKeyBytes());
    const signedPreKeyRec = signal.SignedPreKeyRecord.new(signedPreKeyId, Date.now(), signedPublicKey, signedPrivateKey, signedSignature);

    const preKeys = [];
    const preKeysPub = [];
    for (let i = 0; i < 20; i++) {
        const pk = signal.PrivateKey.generate();
        const pub = pk.getPublicKey();
        const kid = signedPreKeyId + i + 1;
        const rec = signal.PreKeyRecord.new(kid, pub, pk);
        preKeys.push({ id: kid, key: b64e(rec.serialize()) });
        preKeysPub.push({ id: kid, publicKey: b64e(pub.getPublicKeyBytes()) });
    }

    const kyberId = randomId(2147483647);
    const kyberKP = signal.KEMKeyPair.generate();
    const kyberSig = identity.privateKey.sign(kyberKP.getPublicKey().serialize());
    const kyberRec = signal.KyberPreKeyRecord.new(kyberId, Date.now(), kyberKP, kyberSig);

    const publicBundle = {
        deviceId: randomId(255),
        registrationId: randomId(16380),
        identityKey: b64e(identity.publicKey.getPublicKeyBytes()),
        signedPreKey: {
            id: signedPreKeyId,
            publicKey: b64e(signedPublicKey.getPublicKeyBytes()),
            signature: b64e(signedSignature),
            createdAt: new Date().toISOString()
        },
        oneTimePreKeys: preKeysPub,
        kyberPreKey: {
            id: kyberId,
            publicKey: b64e(kyberKP.getPublicKey().serialize()),
            signature: b64e(kyberSig),
            createdAt: new Date().toISOString()
        }
    };

    state = {
        version: 2,
        accountId: id,
        publicBundle,
        privateState: {
            identityKeyPair: b64e(identity.serialize()),
            identityPrivateKey: b64e(identity.privateKey.serialize()),
            signedPreKey: { id: signedPreKeyId, key: b64e(signedPreKeyRec.serialize()) },
            preKeys,
            kyberPreKeys: [{ id: kyberId, key: b64e(kyberRec.serialize()) }]
        },
        sessions: {},
        identities: {},
        senderKeys: {}
    };
    await saveState(id, state);
    return publicBundle;
}

function addr(email, deviceId) { return signal.ProtocolAddress.new(norm(email), Number(deviceId || 1)); }

async function ensureSession(accountId, remoteEmail, remoteBundle) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const remoteAddr = addr(remoteEmail, remoteBundle.deviceId || 1);
    const existing = await stores.sessionStore.getSession(remoteAddr);
    if (!existing) {
        const identityKey = signal.PublicKey.deserialize(b64d(remoteBundle.identityKey));
        const spkPub = signal.PublicKey.deserialize(b64d(remoteBundle.signedPreKey.publicKey));
        const spkSig = b64d(remoteBundle.signedPreKey.signature);
        let preKeyId = null, preKeyPub = null;
        if (remoteBundle.preKey && remoteBundle.preKey.id != null) {
            preKeyId = remoteBundle.preKey.id;
            preKeyPub = signal.PublicKey.deserialize(b64d(remoteBundle.preKey.publicKey));
        } else if (Array.isArray(remoteBundle.oneTimePreKeys) && remoteBundle.oneTimePreKeys.length > 0) {
            preKeyId = remoteBundle.oneTimePreKeys[0].id;
            preKeyPub = signal.PublicKey.deserialize(b64d(remoteBundle.oneTimePreKeys[0].publicKey));
        }
        const kpk = remoteBundle.kyberPreKey;
        if (!kpk || !kpk.publicKey || !kpk.signature) throw new Error("Recipient bundle missing kyber prekey");
        const kyberPub = signal.KEMPublicKey.deserialize(b64d(kpk.publicKey));
        const bundle = signal.PreKeyBundle.new(
            remoteBundle.registrationId,
            remoteBundle.deviceId || 1,
            preKeyId,
            preKeyPub,
            remoteBundle.signedPreKey.id,
            spkPub,
            spkSig,
            identityKey,
            kpk.id,
            kyberPub,
            b64d(kpk.signature)
        );
        const localAddr = addr(accountId, state.publicBundle.deviceId || 1);
        await signal.processPreKeyBundle(bundle, remoteAddr, localAddr, stores.sessionStore, stores.identityStore);
        await saveState(norm(accountId), state);
    }
    return true;
}

async function encryptPrivate(accountId, remoteEmail, remoteBundle, plaintext) {
    await ensureSession(accountId, remoteEmail, remoteBundle);
    const state = await loadState(norm(accountId));
    const stores = makeStores(state);
    const remoteAddr = addr(remoteEmail, remoteBundle.deviceId || 1);
    const localAddr = addr(accountId, state.publicBundle.deviceId || 1);
    const msg = await signal.signalEncrypt(Buffer.from(String(plaintext), "utf8"), remoteAddr, localAddr, stores.sessionStore, stores.identityStore);
    await saveState(norm(accountId), state);
    return { ciphertext: b64e(msg.serialize()), ciphertextType: msg.type() };
}

async function decryptPrivate(accountId, remoteEmail, remoteDeviceId, ciphertextB64, ciphertextType) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const remoteAddr = addr(remoteEmail, remoteDeviceId || 1);
    const localAddr = addr(accountId, state.publicBundle.deviceId || 1);
    const buf = b64d(ciphertextB64);
    let plain;
    if (Number(ciphertextType) === 3) {
        const preKeyMsg = signal.PreKeySignalMessage.deserialize(buf);
        plain = await signal.signalDecryptPreKey(preKeyMsg, remoteAddr, localAddr, stores.sessionStore, stores.identityStore, stores.preKeyStore, stores.signedPreKeyStore, stores.kyberPreKeyStore);
    } else {
        const sigMsg = signal.SignalMessage.deserialize(buf);
        plain = await signal.signalDecrypt(sigMsg, remoteAddr, localAddr, stores.sessionStore, stores.identityStore);
    }
    await saveState(norm(accountId), state);
    return Buffer.from(plain).toString("utf8");
}

async function ensureSenderKeyDistribution(accountId, groupId) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const sender = addr(accountId, state.publicBundle.deviceId || 1);
    const distId = crypto.randomUUID();
    const msg = await signal.SenderKeyDistributionMessage.create(sender, distId, stores.senderKeyStore);
    await saveState(norm(accountId), state);
    return { distributionId: distId, distributionMessage: b64e(msg.serialize()) };
}

async function processSenderKey(accountId, senderEmail, senderDeviceId, distributionMessageB64) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const sender = addr(senderEmail, senderDeviceId || 1);
    const skdm = signal.SenderKeyDistributionMessage.deserialize(b64d(distributionMessageB64));
    await signal.processSenderKeyDistributionMessage(sender, skdm, stores.senderKeyStore);
    await saveState(norm(accountId), state);
    return { distributionId: skdm.distributionId() };
}

async function encryptGroup(accountId, distributionId, plaintext) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const sender = addr(accountId, state.publicBundle.deviceId || 1);
    const msg = await signal.groupEncrypt(sender, distributionId, stores.senderKeyStore, Buffer.from(String(plaintext), "utf8"));
    await saveState(norm(accountId), state);
    return { ciphertext: b64e(msg.serialize()), ciphertextType: msg.type(), distributionId };
}

async function decryptGroup(accountId, senderEmail, senderDeviceId, ciphertextB64) {
    const state = await loadState(norm(accountId));
    if (!state) throw new Error("Local E2EE device not initialized");
    const stores = makeStores(state);
    const sender = addr(senderEmail, senderDeviceId || 1);
    const plain = await signal.groupDecrypt(sender, stores.senderKeyStore, b64d(ciphertextB64));
    await saveState(norm(accountId), state);
    return Buffer.from(plain).toString("utf8");
}

const output = (payload) => { process.stdout.write(`${JSON.stringify(payload)}\n`); };

output({ type: "ready", protocol: "signal-native-bridge", packageAvailable: Boolean(signal.IdentityKeyPair) });

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

input.on("line", async (line) => {
    let requestId = null;
    try {
        const request = JSON.parse(line);
        requestId = request?.requestId || null;
        const t = request?.type;
        if (t === "status") {
            output({ type: "status", requestId, protocol: "signal-native-bridge", messageEncryptionEnabled: true, private: true, group: true });
            return;
        }
        if (t === "ensure-device") {
            output({ type: "device-bundle", requestId, bundle: await ensureDevice(request.accountId) });
            return;
        }
        if (t === "ensure-session") {
            await ensureSession(request.accountId, request.remoteEmail, request.remoteBundle);
            output({ type: "session-ok", requestId, ok: true });
            return;
        }
        if (t === "encrypt-private") {
            const res = await encryptPrivate(request.accountId, request.remoteEmail, request.remoteBundle, request.plaintext);
            output({ type: "ciphertext", requestId, ...res });
            return;
        }
        if (t === "decrypt-private") {
            const plaintext = await decryptPrivate(request.accountId, request.remoteEmail, request.remoteDeviceId, request.ciphertext, request.ciphertextType);
            output({ type: "plaintext", requestId, plaintext });
            return;
        }
        if (t === "create-sender-key") {
            const res = await ensureSenderKeyDistribution(request.accountId, request.groupId);
            output({ type: "sender-key-distribution", requestId, ...res });
            return;
        }
        if (t === "process-sender-key") {
            const res = await processSenderKey(request.accountId, request.senderEmail, request.senderDeviceId, request.distributionMessage);
            output({ type: "sender-key-processed", requestId, ...res });
            return;
        }
        if (t === "encrypt-group") {
            const res = await encryptGroup(request.accountId, request.distributionId, request.plaintext);
            output({ type: "ciphertext", requestId, ...res });
            return;
        }
        if (t === "decrypt-group") {
            const plaintext = await decryptGroup(request.accountId, request.senderEmail, request.senderDeviceId, request.ciphertext);
            output({ type: "plaintext", requestId, plaintext });
            return;
        }
        output({ type: "error", requestId, error: "Unsupported bridge operation" });
    } catch (error) {
        output({ type: "error", requestId, error: error instanceof Error ? error.message : "Invalid bridge request" });
    }
});
