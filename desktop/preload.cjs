const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatAppNative", {
    getE2EEStatus: () => ipcRenderer.invoke("e2ee:status"),
    ensureE2EEDevice: (accountId) => ipcRenderer.invoke("e2ee:ensure-device", accountId),
    ensureSession: (payload) => ipcRenderer.invoke("e2ee:ensure-session", payload),
    encryptPrivate: (payload) => ipcRenderer.invoke("e2ee:encrypt-private", payload),
    decryptPrivate: (payload) => ipcRenderer.invoke("e2ee:decrypt-private", payload),
    createSenderKey: (payload) => ipcRenderer.invoke("e2ee:create-sender-key", payload),
    processSenderKey: (payload) => ipcRenderer.invoke("e2ee:process-sender-key", payload),
    encryptGroup: (payload) => ipcRenderer.invoke("e2ee:encrypt-group", payload),
    decryptGroup: (payload) => ipcRenderer.invoke("e2ee:decrypt-group", payload)
});
