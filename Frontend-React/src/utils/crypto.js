// ──────────────────────────────────────────────────────────────────────────────
// End-to-End Encryption (E2EE) Utility using Web Crypto API
// Protocol: RSA-OAEP 2048-bit (Asymmetric) + AES-GCM 256-bit (Symmetric)
// ──────────────────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate an RSA-OAEP 2048-bit keypair for E2EE
 */
export async function generateRSAKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );

    const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    return {
        publicKeyBase64: arrayBufferToBase64(exportedPublic),
        privateKeyBase64: arrayBufferToBase64(exportedPrivate)
    };
}

/**
 * Get or create local user E2EE key pair stored in browser localStorage
 */
export async function getOrGenerateUserKeys(userEmail) {
    if (!userEmail) return null;
    const cleanEmail = userEmail.trim().toLowerCase();
    const privKeyKey = `e2ee_priv_${cleanEmail}`;
    const pubKeyKey = `e2ee_pub_${cleanEmail}`;

    let priv = localStorage.getItem(privKeyKey);
    let pub = localStorage.getItem(pubKeyKey);

    if (!priv || !pub) {
        const keyPair = await generateRSAKeyPair();
        priv = keyPair.privateKeyBase64;
        pub = keyPair.publicKeyBase64;
        localStorage.setItem(privKeyKey, priv);
        localStorage.setItem(pubKeyKey, pub);
    }

    return { publicKey: pub, privateKey: priv };
}

/**
 * Import a Base64 SPKI Public Key into Web Crypto Key object
 */
async function importPublicKey(spkiBase64) {
    const buffer = base64ToArrayBuffer(spkiBase64);
    return await window.crypto.subtle.importKey(
        "spki",
        buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

/**
 * Import a Base64 PKCS8 Private Key into Web Crypto Key object
 */
async function importPrivateKey(pkcs8Base64) {
    const buffer = base64ToArrayBuffer(pkcs8Base64);
    return await window.crypto.subtle.importKey(
        "pkcs8",
        buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );
}

/**
 * Encrypt a text message using hybrid encryption (AES-GCM 256 + RSA-OAEP 2048)
 */
export async function encryptE2EEMessage(text, recipientPublicKeyBase64, senderPublicKeyBase64) {
    if (!text || !text.trim()) return text;
    if (!recipientPublicKeyBase64 && !senderPublicKeyBase64) {
        return text;
    }

    try {
        // 1. Generate random AES-GCM 256 key
        const aesKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // 2. Generate random 12-byte IV
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // 3. Encrypt message plaintext with AES key
        const encodedText = new TextEncoder().encode(text);
        const encryptedContentBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encodedText
        );

        // 4. Export raw AES key bytes
        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

        // 5. Encrypt AES key for Recipient and Sender
        let ekR = "";
        let ekS = "";

        if (recipientPublicKeyBase64) {
            const recipientKey = await importPublicKey(recipientPublicKeyBase64);
            const encKeyBufferR = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                recipientKey,
                rawAesKey
            );
            ekR = arrayBufferToBase64(encKeyBufferR);
        }

        if (senderPublicKeyBase64) {
            const senderKey = await importPublicKey(senderPublicKeyBase64);
            const encKeyBufferS = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                senderKey,
                rawAesKey
            );
            ekS = arrayBufferToBase64(encKeyBufferS);
        }

        const payload = {
            v: 1,
            e2ee: true,
            ct: arrayBufferToBase64(encryptedContentBuffer),
            iv: arrayBufferToBase64(iv),
            ekR,
            ekS
        };

        return `[E2EE]:${JSON.stringify(payload)}`;
    } catch (err) {
        console.error("E2EE Encryption Error:", err);
        return text; // Fallback to original text if encryption fails
    }
}

/**
 * Decrypt an E2EE payload string using user's private key
 */
export async function decryptE2EEMessage(payloadStr, userPrivateKeyBase64) {
    if (!payloadStr || typeof payloadStr !== "string" || !payloadStr.startsWith("[E2EE]:")) {
        return payloadStr; // Return as-is if plain text / legacy message
    }

    if (!userPrivateKeyBase64) {
        return payloadStr;
    }

    try {
        const jsonStr = payloadStr.slice(7);
        const payload = JSON.parse(jsonStr);
        const { ct, iv, ekR, ekS } = payload;

        const privKey = await importPrivateKey(userPrivateKeyBase64);

        // Try decrypting recipient key (ekR), then sender key (ekS)
        let rawAesKeyBuffer = null;
        if (ekR) {
            try {
                rawAesKeyBuffer = await window.crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    privKey,
                    base64ToArrayBuffer(ekR)
                );
            } catch (e) {
                // Ignore and try ekS
            }
        }

        if (!rawAesKeyBuffer && ekS) {
            try {
                rawAesKeyBuffer = await window.crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    privKey,
                    base64ToArrayBuffer(ekS)
                );
            } catch (e) {
                // Ignore
            }
        }

        if (!rawAesKeyBuffer) {
            return "[Encrypted Message]";
        }

        // Import decrypted AES key
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawAesKeyBuffer,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        // Decrypt ciphertext with AES-GCM
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
            aesKey,
            base64ToArrayBuffer(ct)
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.error("E2EE Decryption Error:", err);
        return payloadStr;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Group E2EE Helpers (AES-GCM 256 + RSA Key Wrapping)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Generate a random 256-bit AES-GCM group key formatted as base64 string
 */
export async function generateAESGroupKey() {
    const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const raw = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(raw);
}

/**
 * Encrypt Group Key for each group member using their RSA public key
 * @param {string} groupKeyBase64 
 * @param {Object} memberPublicKeysMap - { [email]: publicKeyBase64 }
 * @returns {Object} { [email]: encryptedGroupKeyBase64 }
 */
export async function encryptGroupKeyForMembers(groupKeyBase64, memberPublicKeysMap) {
    const rawKeyBuffer = base64ToArrayBuffer(groupKeyBase64);
    const encryptedMap = {};
    for (const [email, pubKeyBase64] of Object.entries(memberPublicKeysMap)) {
        if (!pubKeyBase64) continue;
        try {
            const pubKey = await importPublicKey(pubKeyBase64);
            const encBuffer = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                pubKey,
                rawKeyBuffer
            );
            encryptedMap[email] = arrayBufferToBase64(encBuffer);
        } catch (err) {
            console.error(`Failed to encrypt group key for ${email}:`, err);
        }
    }
    return encryptedMap;
}

/**
 * Decrypt Group Key using user's private key
 * @param {string} encryptedGroupKeyBase64 
 * @param {string} privateKeyBase64 
 * @returns {string|null} base64 raw AES group key
 */
export async function decryptGroupKey(encryptedGroupKeyBase64, privateKeyBase64) {
    if (!encryptedGroupKeyBase64 || !privateKeyBase64) return null;
    try {
        const privKey = await importPrivateKey(privateKeyBase64);
        const rawBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privKey,
            base64ToArrayBuffer(encryptedGroupKeyBase64)
        );
        return arrayBufferToBase64(rawBuffer);
    } catch (err) {
        console.error("Failed to decrypt group key:", err);
        return null;
    }
}

/**
 * Encrypt a text message for group chat using the Group Key
 */
export async function encryptGroupMessage(text, rawGroupKeyBase64) {
    if (!text || !text.trim() || !rawGroupKeyBase64) return text;
    try {
        const rawKeyBuffer = base64ToArrayBuffer(rawGroupKeyBase64);
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawKeyBuffer,
            { name: "AES-GCM" },
            false,
            ["encrypt"]
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);
        const encryptedContentBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encodedText
        );

        const payload = {
            v: 1,
            e2eeGroup: true,
            ct: arrayBufferToBase64(encryptedContentBuffer),
            iv: arrayBufferToBase64(iv)
        };

        return `[E2EE_GROUP]:${JSON.stringify(payload)}`;
    } catch (err) {
        console.error("Group E2EE Encryption Error:", err);
        return text;
    }
}

/**
 * Decrypt a group E2EE payload string using the raw Group Key
 */
export async function decryptGroupMessage(payloadStr, rawGroupKeyBase64) {
    if (!payloadStr || typeof payloadStr !== "string" || !payloadStr.startsWith("[E2EE_GROUP]:")) {
        return payloadStr; // Fallback for plain text / standard E2EE / legacy messages
    }
    if (!rawGroupKeyBase64) {
        return payloadStr;
    }
    try {
        const jsonStr = payloadStr.slice(13);
        const payload = JSON.parse(jsonStr);
        const { ct, iv } = payload;

        const rawKeyBuffer = base64ToArrayBuffer(rawGroupKeyBase64);
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawKeyBuffer,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
            aesKey,
            base64ToArrayBuffer(ct)
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.error("Group E2EE Decryption Error:", err);
        return payloadStr;
    }
}

