import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
    createCloudBackupAPI,
    fetchCloudBackupAPI,
    deleteCloudBackupAPI
} from "../services/api";

export default function BackupModal({ onClose, messages = [], selectedUser }) {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState("cloud");
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState(""); // "success" | "error" | "loading"
    const [restoredMessages, setRestoredMessages] = useState([]);
    const [importedMessages, setImportedMessages] = useState([]);
    const [backupInfo, setBackupInfo] = useState(null);
    const fileInputRef = useRef(null);

    // ── Helpers ─────────────────────────────────────────────────────────────

    const showStatus = (msg, type = "success") => {
        setStatus(msg);
        setStatusType(type);
        if (type !== "loading") setTimeout(() => setStatus(""), 4000);
    };

    const getCurrentSettings = () => ({
        theme: localStorage.getItem("chatTheme") || "dark",
        notifications: localStorage.getItem("notificationsEnabled") || "true",
        fontSize: localStorage.getItem("fontSize") || "medium",
        soundEnabled: localStorage.getItem("soundEnabled") || "true",
        enterToSend: localStorage.getItem("enterToSend") || "true",
        language: localStorage.getItem("language") || "en",
        backupDate: new Date().toISOString()
    });

    const applySettings = (settings) => {
        if (!settings) return;
        Object.entries(settings).forEach(([key, value]) => {
            if (key !== "backupDate") localStorage.setItem(key, value);
        });
        if (settings.theme) {
            document.body.setAttribute("data-theme", settings.theme);
        }
    };

    const textMessages = messages.filter(m => !m.fileUrl && !m.mediaUrl);
    const mediaMessages = messages.filter(m => m.fileUrl || m.mediaUrl);

    // ── Cloud Backup ─────────────────────────────────────────────────────────

    const handleCloudBackup = async () => {
        showStatus("Backing up messages to cloud...", "loading");
        try {
            const payload = {
                messages: messages.map(m => ({
                    _id: m._id,
                    sender: m.sender,
                    receiver: m.receiver,
                    text: m.text,
                    timestamp: m.timestamp,
                    replyTo: m.replyTo || null,
                    isDeleted: m.isDeleted || false,
                    reactions: m.reactions || []
                })),
                settings: getCurrentSettings(),
                backupType: "text"
            };
            const res = await createCloudBackupAPI(token, payload);
            if (res.backup || res.message?.includes("success")) {
                showStatus(`✅ Cloud backup created! ${payload.messages.length} messages backed up.`, "success");
                setBackupInfo({ count: payload.messages.length, date: new Date().toLocaleString() });
            } else {
                throw new Error(res.message || "Backup failed");
            }
        } catch (err) {
            showStatus("❌ Cloud backup failed: " + err.message, "error");
        }
    };

    // ── Restore from Cloud ───────────────────────────────────────────────────

    const handleRestoreCloud = async () => {
        showStatus("Fetching cloud backup...", "loading");
        try {
            const res = await fetchCloudBackupAPI(token);
            if (res.backup) {
                setRestoredMessages(res.backup.messages || []);
                const updatedAt = new Date(res.backup.updatedAt).toLocaleString();
                showStatus(`✅ Backup restored! ${res.backup.messages?.length || 0} messages found. Last backed up: ${updatedAt}`, "success");
            } else {
                showStatus("⚠️ No cloud backup found. Please create one first.", "error");
            }
        } catch (err) {
            showStatus("❌ Restore failed: " + err.message, "error");
        }
    };

    const handleDeleteCloudBackup = async () => {
        if (!window.confirm("Are you sure you want to delete your cloud backup? This cannot be undone.")) return;
        showStatus("Deleting backup...", "loading");
        try {
            const res = await deleteCloudBackupAPI(token);
            if (res.message?.includes("success")) {
                setRestoredMessages([]);
                setBackupInfo(null);
                showStatus("✅ Cloud backup deleted successfully.", "success");
            } else {
                throw new Error(res.message || "Delete failed");
            }
        } catch (err) {
            showStatus("❌ Delete failed: " + err.message, "error");
        }
    };

    // ── Media Backup ─────────────────────────────────────────────────────────

    const handleMediaBackup = async () => {
        showStatus("Backing up media messages to cloud...", "loading");
        try {
            const payload = {
                messages: messages.map(m => ({
                    _id: m._id,
                    sender: m.sender,
                    receiver: m.receiver,
                    text: m.text,
                    fileUrl: m.fileUrl || null,
                    mediaUrl: m.mediaUrl || null,
                    fileType: m.fileType || null,
                    timestamp: m.timestamp
                })),
                mediaMessages: mediaMessages.map(m => ({
                    _id: m._id,
                    sender: m.sender,
                    fileUrl: m.fileUrl || null,
                    mediaUrl: m.mediaUrl || null,
                    fileType: m.fileType || null,
                    timestamp: m.timestamp
                })),
                settings: getCurrentSettings(),
                backupType: "media"
            };
            const res = await createCloudBackupAPI(token, payload);
            if (res.backup || res.message?.includes("success")) {
                showStatus(`✅ Media backup complete! ${payload.mediaMessages.length} media files backed up.`, "success");
            } else {
                throw new Error(res.message || "Media backup failed");
            }
        } catch (err) {
            showStatus("❌ Media backup failed: " + err.message, "error");
        }
    };

    // ── Settings Backup ──────────────────────────────────────────────────────

    const handleSettingsBackup = async () => {
        showStatus("Backing up settings...", "loading");
        try {
            const settings = getCurrentSettings();
            const res = await createCloudBackupAPI(token, {
                messages: [],
                settings,
                backupType: "settings"
            });
            if (res.backup || res.message?.includes("success")) {
                showStatus("✅ Settings backed up to cloud!", "success");
            } else {
                throw new Error(res.message || "Settings backup failed");
            }
        } catch (err) {
            showStatus("❌ Settings backup failed: " + err.message, "error");
        }
    };

    const handleRestoreSettings = async () => {
        showStatus("Fetching settings backup...", "loading");
        try {
            const res = await fetchCloudBackupAPI(token);
            if (res.backup?.settings && Object.keys(res.backup.settings).length > 0) {
                applySettings(res.backup.settings);
                showStatus("✅ Settings restored from cloud backup!", "success");
            } else {
                showStatus("⚠️ No settings found in cloud backup.", "error");
            }
        } catch (err) {
            showStatus("❌ Settings restore failed: " + err.message, "error");
        }
    };

    // ── Export Chats ─────────────────────────────────────────────────────────

    const handleExportChats = () => {
        const exportData = {
            exportedBy: user?.email,
            exportedAt: new Date().toISOString(),
            chatWith: selectedUser?.name || "All Chats",
            totalMessages: messages.length,
            messages: messages.map(m => ({
                _id: m._id,
                sender: m.sender,
                receiver: m.receiver,
                text: m.text,
                fileUrl: m.fileUrl || null,
                fileType: m.fileType || null,
                timestamp: m.timestamp,
                reactions: m.reactions || [],
                isDeleted: m.isDeleted || false,
                replyTo: m.replyTo || null
            }))
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_export_${selectedUser?.name || "all"}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showStatus(`✅ Exported ${messages.length} messages as JSON file!`, "success");
    };

    // ── Import Chats ─────────────────────────────────────────────────────────

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith(".json")) {
            showStatus("❌ Please select a valid .json export file.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.messages || !Array.isArray(parsed.messages)) {
                    showStatus("❌ Invalid format. File must be a ChatApp export.", "error");
                    return;
                }
                setImportedMessages(parsed.messages);
                showStatus(`✅ Imported ${parsed.messages.length} messages from ${parsed.chatWith || "unknown chat"} (exported ${new Date(parsed.exportedAt).toLocaleString()})`, "success");
            } catch {
                showStatus("❌ Failed to parse JSON file. Make sure it's a valid export.", "error");
            }
        };
        reader.readAsText(file);
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const tabs = [
        { id: "cloud", label: "☁️ Cloud Backup" },
        { id: "restore", label: "⬇️ Restore" },
        { id: "media", label: "🖼️ Media Backup" },
        { id: "settings", label: "⚙️ Settings" },
        { id: "export", label: "📤 Export" },
        { id: "import", label: "📥 Import" }
    ];

    const formatTime = (ts) => {
        if (!ts) return "";
        return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div
            id="backupModal"
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                borderRadius: "20px",
                border: "1px solid rgba(99,102,241,0.3)",
                boxShadow: "0 25px 80px rgba(99,102,241,0.3)",
                width: "100%",
                maxWidth: "700px",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}>
                {/* Header */}
                <div style={{
                    padding: "24px 28px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div>
                            <h2 style={{ margin: 0, color: "#fff", fontSize: "22px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "28px" }}>☁️</span>
                                Backup & Export
                            </h2>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                                Manage your chat data and settings
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "10px",
                                color: "#fff",
                                width: "36px",
                                height: "36px",
                                cursor: "pointer",
                                fontSize: "18px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >×</button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "1px" }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setStatus(""); }}
                                style={{
                                    padding: "8px 14px",
                                    borderRadius: "10px 10px 0 0",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.2s",
                                    background: activeTab === tab.id
                                        ? "rgba(99,102,241,0.3)"
                                        : "transparent",
                                    color: activeTab === tab.id ? "#a5b4fc" : "rgba(255,255,255,0.45)",
                                    borderBottom: activeTab === tab.id
                                        ? "2px solid #818cf8"
                                        : "2px solid transparent"
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

                    {/* Status Banner */}
                    {status && (
                        <div style={{
                            padding: "12px 16px",
                            borderRadius: "12px",
                            marginBottom: "20px",
                            fontSize: "14px",
                            fontWeight: 600,
                            border: "1px solid",
                            background: statusType === "success"
                                ? "rgba(16,185,129,0.15)"
                                : statusType === "error"
                                    ? "rgba(239,68,68,0.15)"
                                    : "rgba(99,102,241,0.15)",
                            borderColor: statusType === "success"
                                ? "rgba(16,185,129,0.4)"
                                : statusType === "error"
                                    ? "rgba(239,68,68,0.4)"
                                    : "rgba(99,102,241,0.4)",
                            color: statusType === "success"
                                ? "#6ee7b7"
                                : statusType === "error"
                                    ? "#fca5a5"
                                    : "#a5b4fc"
                        }}>
                            {statusType === "loading" && <span style={{ marginRight: 8 }}>⏳</span>}
                            {status}
                        </div>
                    )}

                    {/* ── Cloud Backup Tab ── */}
                    {activeTab === "cloud" && (
                        <div>
                            <StatCard
                                icon="💬" label="Total Messages" value={messages.length}
                                color="#6366f1"
                            />
                            <StatCard
                                icon="🖼️" label="Media Files" value={mediaMessages.length}
                                color="#8b5cf6"
                            />
                            <StatCard
                                icon="📝" label="Text Messages" value={textMessages.length}
                                color="#06b6d4"
                            />
                            {backupInfo && (
                                <div style={infoBoxStyle}>
                                    ✅ Last backup: {backupInfo.count} messages on {backupInfo.date}
                                </div>
                            )}
                            <ActionButton
                                icon="☁️"
                                label="Backup Now"
                                description="Save all messages and settings to the cloud"
                                gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
                                onClick={handleCloudBackup}
                            />
                        </div>
                    )}

                    {/* ── Restore Tab ── */}
                    {activeTab === "restore" && (
                        <div>
                            <ActionButton
                                icon="⬇️"
                                label="Restore from Cloud"
                                description="Fetch your latest cloud backup and preview messages"
                                gradient="linear-gradient(135deg, #0ea5e9, #06b6d4)"
                                onClick={handleRestoreCloud}
                            />
                            <ActionButton
                                icon="🗑️"
                                label="Delete Cloud Backup"
                                description="Permanently delete your stored cloud backup"
                                gradient="linear-gradient(135deg, #ef4444, #dc2626)"
                                onClick={handleDeleteCloudBackup}
                            />
                            {restoredMessages.length > 0 && (
                                <div style={{ marginTop: "20px" }}>
                                    <h4 style={{ color: "#a5b4fc", marginBottom: "12px", fontWeight: 700 }}>
                                        📋 Restored Messages ({restoredMessages.length})
                                    </h4>
                                    <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {restoredMessages.slice(0, 30).map((msg, i) => (
                                            <MessagePreview key={i} msg={msg} myEmail={user?.email} formatTime={formatTime} />
                                        ))}
                                        {restoredMessages.length > 30 && (
                                            <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "13px", padding: "8px" }}>
                                                + {restoredMessages.length - 30} more messages
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Media Backup Tab ── */}
                    {activeTab === "media" && (
                        <div>
                            <StatCard icon="🖼️" label="Images & Videos" value={mediaMessages.filter(m => m.fileType?.startsWith("image") || m.fileType?.startsWith("video")).length} color="#f59e0b" />
                            <StatCard icon="📎" label="Documents" value={mediaMessages.filter(m => m.fileType?.startsWith("application")).length} color="#10b981" />
                            <StatCard icon="🎵" label="Audio Files" value={mediaMessages.filter(m => m.fileType?.startsWith("audio")).length} color="#8b5cf6" />

                            <div style={infoBoxStyle}>
                                ⚠️ Media backup stores file URLs and metadata. Large base64 files may be excluded to stay within server limits.
                            </div>

                            <ActionButton
                                icon="🖼️"
                                label="Backup Media"
                                description="Save all media message metadata and URLs to cloud"
                                gradient="linear-gradient(135deg, #f59e0b, #f97316)"
                                onClick={handleMediaBackup}
                            />
                        </div>
                    )}

                    {/* ── Settings Backup Tab ── */}
                    {activeTab === "settings" && (
                        <div>
                            <h4 style={{ color: "#a5b4fc", marginBottom: "16px", fontWeight: 700 }}>Current Settings</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                                {Object.entries(getCurrentSettings()).filter(([k]) => k !== "backupDate").map(([key, val]) => (
                                    <div key={key} style={{
                                        background: "rgba(255,255,255,0.05)",
                                        borderRadius: "10px",
                                        padding: "12px 14px",
                                        border: "1px solid rgba(255,255,255,0.08)"
                                    }}>
                                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>{key}</div>
                                        <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 600 }}>{String(val)}</div>
                                    </div>
                                ))}
                            </div>
                            <ActionButton
                                icon="⚙️"
                                label="Backup Settings"
                                description="Save your current settings to the cloud"
                                gradient="linear-gradient(135deg, #10b981, #059669)"
                                onClick={handleSettingsBackup}
                            />
                            <ActionButton
                                icon="🔄"
                                label="Restore Settings"
                                description="Apply settings from your last cloud backup"
                                gradient="linear-gradient(135deg, #06b6d4, #0284c7)"
                                onClick={handleRestoreSettings}
                            />
                        </div>
                    )}

                    {/* ── Export Tab ── */}
                    {activeTab === "export" && (
                        <div>
                            <StatCard icon="💬" label="Messages to Export" value={messages.length} color="#6366f1" />
                            <div style={infoBoxStyle}>
                                📄 Exports all messages as a <strong>.json</strong> file. You can re-import this file later. Media file URLs are included, but actual media is not embedded.
                            </div>
                            <ActionButton
                                icon="📤"
                                label="Export Chats"
                                description={`Download ${messages.length} messages as a JSON file`}
                                gradient="linear-gradient(135deg, #6366f1, #0ea5e9)"
                                onClick={handleExportChats}
                            />
                        </div>
                    )}

                    {/* ── Import Tab ── */}
                    {activeTab === "import" && (
                        <div>
                            <div style={infoBoxStyle}>
                                📥 Select a <strong>.json</strong> file that was previously exported from ChatApp. Messages will be shown in a preview below — they will <em>not</em> be re-sent or modify your current chat.
                            </div>
                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleImportFile}
                            />
                            <ActionButton
                                icon="📁"
                                label="Choose Export File"
                                description="Select a .json file exported from ChatApp"
                                gradient="linear-gradient(135deg, #8b5cf6, #6366f1)"
                                onClick={() => fileInputRef.current?.click()}
                            />
                            {importedMessages.length > 0 && (
                                <div style={{ marginTop: "20px" }}>
                                    <h4 style={{ color: "#a5b4fc", marginBottom: "12px", fontWeight: 700 }}>
                                        📋 Imported Messages ({importedMessages.length})
                                    </h4>
                                    <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {importedMessages.slice(0, 50).map((msg, i) => (
                                            <MessagePreview key={i} msg={msg} myEmail={user?.email} formatTime={formatTime} />
                                        ))}
                                        {importedMessages.length > 50 && (
                                            <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: "13px", padding: "8px" }}>
                                                + {importedMessages.length - 50} more messages
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 16px",
            borderRadius: "14px",
            marginBottom: "10px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${color}33`
        }}>
            <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: `${color}22`,
                border: `1px solid ${color}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0
            }}>{icon}</div>
            <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                <div style={{ color: "#f1f5f9", fontSize: "22px", fontWeight: 700 }}>{value}</div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, description, gradient, onClick }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "12px",
                background: hover ? gradient : "rgba(255,255,255,0.04)",
                transition: "all 0.25s ease",
                textAlign: "left",
                transform: hover ? "translateY(-2px)" : "none",
                boxShadow: hover ? "0 8px 24px rgba(0,0,0,0.3)" : "none"
            }}
        >
            <span style={{ fontSize: "28px", flexShrink: 0 }}>{icon}</span>
            <div>
                <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "15px" }}>{label}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "2px" }}>{description}</div>
            </div>
        </button>
    );
}

function MessagePreview({ msg, myEmail, formatTime }) {
    const isMe = msg.sender === myEmail;
    return (
        <div style={{
            padding: "8px 12px",
            borderRadius: "10px",
            background: isMe ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isMe ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`,
            display: "flex",
            gap: "10px",
            alignItems: "flex-start"
        }}>
            <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: isMe ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0
            }}>
                {(msg.sender || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ color: isMe ? "#a5b4fc" : "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600 }}>
                        {msg.sender}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                        {formatTime(msg.timestamp)}
                    </span>
                </div>
                <div style={{ color: msg.isDeleted ? "rgba(255,255,255,0.3)" : "#e2e8f0", fontSize: "13px", wordBreak: "break-word", fontStyle: msg.isDeleted ? "italic" : "normal" }}>
                    {msg.isDeleted ? "🚫 This message was deleted"
                        : msg.fileUrl ? "📎 " + (msg.fileType || "File")
                        : msg.text || "—"}
                </div>
            </div>
        </div>
    );
}

const infoBoxStyle = {
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "16px",
    background: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.25)",
    color: "rgba(255,255,255,0.65)",
    fontSize: "13px",
    lineHeight: "1.5"
};
