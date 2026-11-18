import { useEffect, useRef, useState } from "react";
import {
    backupChat,
    restoreChat,
    createCloudBackup,
    listCloudBackups,
    restoreCloudBackup,
    importCloudBackup
} from "../services/api";
import { useAuth } from "../context/AuthContext";

const mediaTypes = new Set(["image", "media", "video", "document", "voice"]);

const colors = {
    panel: "#172746",
    panelLight: "#21375b",
    border: "rgba(133, 164, 220, 0.24)",
    muted: "#a7b0c7",
    text: "#f4f5ff",
    accent: "#4b4fd1",
    gold: "#b87824"
};

const isMedia = (message) => mediaTypes.has(message.messageType) || Boolean(message.mediaUrl);

export default function BackupRestoreModal({ selectedUser, onRestoreComplete, onClose }) {
    const { token } = useAuth();
    const [loadingBackup, setLoadingBackup] = useState(false);
    const [loadingRestore, setLoadingRestore] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [cloudBackups, setCloudBackups] = useState([]);
    const [selectedBackup, setSelectedBackup] = useState("");
    const [activeSection, setActiveSection] = useState("cloud");
    const [mediaBackupEnabled, setMediaBackupEnabled] = useState(
        localStorage.getItem("backupIncludeMedia") !== "false"
    );
    const [stats, setStats] = useState({ messages: 0, media: 0 });
    const [mediaStats, setMediaStats] = useState({ image: 0, document: 0, voice: 0 });
    const [settings, setSettings] = useState({
        theme: localStorage.getItem("chatTheme") || "dark",
        notifications: true,
        fontSize: "medium",
        soundEnabled: true,
        enterToSend: true,
        language: "en"
    });
    const fileInputRef = useRef(null);

    const updateMediaStats = (messages = []) => {
        const counts = { image: 0, document: 0, voice: 0 };
        messages.forEach((message) => {
            if (message.messageType === "image" || message.messageType === "media" || message.messageType === "video") counts.image++;
            if (message.messageType === "document") counts.document++;
            if (message.messageType === "voice") counts.voice++;
        });
        setMediaStats(counts);
    };

    const loadCurrentChatStats = async () => {
        const params = {};
        if (selectedUser) {
            if (selectedUser.isGroup) params.groupId = selectedUser._id;
            else params.withUser = selectedUser.email;
        }
        const data = await backupChat(token, params);
        if (!Array.isArray(data.messages)) return;
        updateStats(data.count, data.mediaCount);
        updateMediaStats(data.messages);
    };

    useEffect(() => {
        listCloudBackups(token)
            .then((data) => {
                if (!Array.isArray(data)) return;
                setCloudBackups(data);
                const latest = data[0];
                if (latest) {
                    setStats({
                        messages: latest.messageCount || 0,
                        media: latest.mediaCount || 0
                    });
                }
            })
            .catch(() => {});
        loadCurrentChatStats().catch(() => {});
    }, [token, selectedUser]);

    const updateStats = (messages, media) => {
        setStats({ messages: messages || 0, media: media || 0 });
    };

    const setMediaEnabled = (enabled) => {
        setMediaBackupEnabled(enabled);
        localStorage.setItem("backupIncludeMedia", String(enabled));
    };

    const handleCloudBackup = async (backupType = "cloud") => {
        setLoadingBackup(true);
        setStatusMessage("");
        try {
            const data = await createCloudBackup(token, {
                includeMedia: mediaBackupEnabled,
                withUser: selectedUser?.isGroup ? undefined : selectedUser?.email,
                groupId: selectedUser?.isGroup ? selectedUser._id : undefined,
                settings: { theme: settings.theme }
            });
            if (!data.id) {
                setStatusMessage(`❌ ${data.message || "Cloud backup failed"}${data.error ? `: ${data.error}` : ""}`);
                return;
            }
            setCloudBackups((previous) => [data, ...previous]);
            setSelectedBackup(String(data.id));
            updateStats(data.messageCount, data.mediaCount);
            await loadCurrentChatStats();
            const successMessages = {
                cloud: "✅ Cloud backup created.",
                media: "✅ Media backup created.",
                settings: "✅ Settings backup created."
            };
            setStatusMessage(successMessages[backupType]);
        } catch (err) {
            setStatusMessage(`❌ Cloud backup failed: ${err.message}`);
        } finally {
            setLoadingBackup(false);
        }
    };

    const handleCloudRestore = async () => {
        if (!selectedBackup) return;
        if (!window.confirm("Restore this backup by merging missing messages? Existing messages will not be overwritten.")) return;
        setLoadingRestore(true);
        setStatusMessage("");
        try {
            const data = await restoreCloudBackup(token, selectedBackup);
            if (data.insertedCount === undefined) {
                setStatusMessage(`❌ ${data.message || "Restore failed"}`);
                return;
            }
            if (data.settings?.theme) {
                localStorage.setItem("chatTheme", data.settings.theme);
            }
            setStatusMessage(`✅ Restored ${data.insertedCount} messages; skipped ${data.skippedCount || 0}.`);
            onRestoreComplete?.();
        } catch (err) {
            setStatusMessage(`❌ Restore failed: ${err.message}`);
        } finally {
            setLoadingRestore(false);
        }
    };

    const handleBackup = async (all = false) => {
        setLoadingBackup(true);
        setStatusMessage("");
        try {
            const params = {};
            if (!all && selectedUser) {
                if (selectedUser.isGroup) params.groupId = selectedUser._id;
                else params.withUser = selectedUser.email;
            }
            const data = await backupChat(token, params);
            if (!data.messages) {
                setStatusMessage(`❌ Backup failed: ${data.message || "Unknown error"}`);
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeName = selectedUser && !all
                ? selectedUser.name.replace(/[^a-z0-9]/gi, "_")
                : "all_chats";
            link.download = `chat_backup_${safeName}_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            updateStats(data.count, data.mediaCount);
            updateMediaStats(data.messages);
            setStatusMessage("✅ Successfully exported the chat.");
        } catch (err) {
            setStatusMessage(`❌ Backup failed: ${err.message}`);
        } finally {
            setLoadingBackup(false);
        }
    };

    const handleRestoreFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLoadingRestore(true);
        setStatusMessage("");
        try {
            const json = JSON.parse(await file.text());
            if (json.format === "chatapp-backup") {
                const result = await importCloudBackup(token, json);
                if (result.insertedCount === undefined) {
                    setStatusMessage(`❌ ${result.message || "Import failed"}`);
                    return;
                }
                setStatusMessage(`✅ Imported ${result.insertedCount} messages; skipped ${result.skippedCount || 0}.`);
                onRestoreComplete?.();
                return;
            }
            const messages = Array.isArray(json) ? json : json.messages;
            if (!Array.isArray(messages) || messages.length === 0) {
                setStatusMessage("❌ Invalid backup file: no messages array found");
                return;
            }
            const result = await restoreChat(token, messages);
            if (result.insertedCount === undefined) {
                setStatusMessage(`❌ ${result.message || "Failed to restore"}`);
                return;
            }
            setStatusMessage(`✅ Restored ${result.insertedCount} new messages successfully!`);
            onRestoreComplete?.();
        } catch (err) {
            setStatusMessage(`❌ Error reading backup file: ${err.message}`);
        } finally {
            setLoadingRestore(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const tabs = [
        ["cloud", "☁️", "Cloud Backup"],
        ["restore", "⬇️", "Restore"],
        ["media", "🖼️", "Media Backup"],
        ["settings", "⚙️", "Settings"],
        ["export", "📥", "Export"],
        ["import", "📥", "Import"]
    ];

    const tabStyle = (section) => ({
        border: 0,
        borderBottom: activeSection === section ? "3px solid #6d72ff" : "3px solid transparent",
        background: activeSection === section ? "rgba(79, 78, 196, 0.72)" : "transparent",
        color: activeSection === section ? "#c5caff" : colors.muted,
        padding: "12px 18px 10px",
        fontSize: "15px",
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer"
    });

    const cardStyle = {
        background: `linear-gradient(135deg, ${colors.panelLight}, ${colors.panel})`,
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "20px"
    };

    const actionStyle = {
        ...cardStyle,
        width: "100%",
        textAlign: "left",
        color: colors.text,
        cursor: "pointer"
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 999999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(4, 8, 24, 0.82)",
                backdropFilter: "blur(5px)",
                padding: "18px"
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "min(900px, 96vw)",
                    maxHeight: "92vh",
                    overflow: "hidden auto",
                    color: colors.text,
                    borderRadius: "18px",
                    background: "linear-gradient(145deg, #252751, #142a4c)",
                    boxShadow: "0 25px 70px rgba(0,0,0,.45)",
                    fontFamily: "inherit"
                }}
            >
                <header style={{ padding: "28px 30px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "29px", fontWeight: 800 }}>
                            <span>☁️</span>
                            <span>Backup &amp; Export</span>
                        </div>
                        <div style={{ color: colors.muted, fontSize: "16px", marginTop: "8px" }}>Manage your chat data and settings</div>
                    </div>
                    <button onClick={onClose} aria-label="Close backup dialog" style={{ background: "rgba(255,255,255,.08)", border: `1px solid ${colors.border}`, color: colors.text, borderRadius: "14px", fontSize: "25px", width: "48px", height: "48px", cursor: "pointer" }}>×</button>
                </header>

                <nav style={{ display: "flex", overflowX: "auto", padding: "10px 24px 0", borderBottom: `1px solid ${colors.border}` }}>
                    {tabs.map(([section, icon, label]) => (
                        <button key={section} onClick={() => setActiveSection(section)} style={tabStyle(section)}>
                            {icon} {label}
                        </button>
                    ))}
                </nav>

                <main style={{ padding: "30px" }}>
                    {statusMessage && (
                        <div style={{ ...cardStyle, marginBottom: "18px", color: statusMessage.startsWith("✅") ? "#6ee7a1" : "#ff9f9f" }}>
                            {statusMessage}
                        </div>
                    )}

                    {activeSection === "cloud" && (
                        <>
                            <div style={{ display: "grid", gap: "14px" }}>
                                <div style={cardStyle}><Stat icon="💬" label="TOTAL MESSAGES" value={stats.messages} /></div>
                                <div style={cardStyle}><Stat icon="🖼️" label="MEDIA FILES" value={stats.media} /></div>
                                <div style={cardStyle}><Stat icon="📝" label="TEXT MESSAGES" value={Math.max(0, stats.messages - stats.media)} /></div>
                            </div>
                            <button onClick={() => handleCloudBackup("cloud")} disabled={loadingBackup} style={{ ...actionStyle, marginTop: "20px" }}>
                                <Action icon="☁️" title={loadingBackup ? "Backing up..." : "Backup Now"} subtitle="Save all messages and settings to the cloud" />
                            </button>
                        </>
                    )}

                    {activeSection === "media" && (
                        <>
                            <div style={{ display: "grid", gap: "14px" }}>
                                <div style={{ ...cardStyle, borderColor: "rgba(208, 142, 41, .5)" }}><Stat icon="🖼️" label="IMAGES & VIDEOS" value={mediaStats.image} /></div>
                                <div style={{ ...cardStyle, borderColor: "rgba(32, 180, 161, .5)" }}><Stat icon="📎" label="DOCUMENTS" value={mediaStats.document} /></div>
                                <div style={{ ...cardStyle, borderColor: "rgba(125, 86, 220, .5)" }}><Stat icon="🎵" label="AUDIO FILES" value={mediaStats.voice} /></div>
                            </div>
                            <div style={{ ...cardStyle, marginTop: "14px", color: "#c5c8d3" }}>⚠️ Media backup stores file URLs and metadata. Large base64 files may be excluded to stay within server limits.</div>
                            <button onClick={() => handleCloudBackup("media")} disabled={loadingBackup} style={{ ...actionStyle, marginTop: "20px" }}>
                                <Action icon="🖼️" title={loadingBackup ? "Backing up..." : "Backup Media"} subtitle="Save all media message metadata and URLs to cloud" />
                            </button>
                            <label style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "16px", color: colors.muted }}>
                                <input type="checkbox" checked={mediaBackupEnabled} onChange={(event) => setMediaEnabled(event.target.checked)} />
                                Include media in cloud backups
                            </label>
                        </>
                    )}

                    {activeSection === "export" && (
                        <>
                            <div style={cardStyle}><Stat icon="💬" label="MESSAGES TO EXPORT" value={stats.messages} /></div>
                            <div style={{ ...cardStyle, marginTop: "14px", color: "#c5c8d3" }}>📄 Exports all messages as a <strong>.json</strong> file. You can re-import this file later. Media file URLs are included, but actual media is not embedded.</div>
                            <button onClick={() => handleBackup(true)} disabled={loadingBackup} style={{ ...actionStyle, marginTop: "20px" }}>
                                <Action icon="📥" title={loadingBackup ? "Exporting..." : "Export Chats"} subtitle={`Download ${stats.messages} messages as a JSON file`} />
                            </button>
                        </>
                    )}

                    {activeSection === "import" && (
                        <>
                            <div style={{ ...cardStyle, marginBottom: "20px", color: "#c5c8d3" }}>📥 Select a <strong>.json</strong> file that was previously exported from ChatApp. Messages will be merged without creating duplicates.</div>
                            <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleRestoreFile} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={loadingRestore} style={actionStyle}>
                                <Action icon="📁" title={loadingRestore ? "Importing..." : "Choose Export File"} subtitle="Select a .json file exported from ChatApp" />
                            </button>
                        </>
                    )}

                    {activeSection === "restore" && (
                        <>
                            <div style={{ ...cardStyle, marginBottom: "20px", color: "#c5c8d3" }}>↩️ Restore a previous encrypted cloud backup. Existing messages are not overwritten.</div>
                            {cloudBackups.length ? (
                                <div style={{ display: "flex", gap: "12px" }}>
                                    <select value={selectedBackup} onChange={(event) => setSelectedBackup(event.target.value)} style={{ flex: 1, padding: "14px", borderRadius: "10px", background: colors.panel, color: colors.text, border: `1px solid ${colors.border}` }}>
                                        <option value="">Select backup</option>
                                        {cloudBackups.map((backup) => <option key={String(backup._id || backup.id)} value={String(backup._id || backup.id)}>{new Date(backup.createdAt).toLocaleString()}</option>)}
                                    </select>
                                    <button onClick={handleCloudRestore} disabled={!selectedBackup || loadingRestore} style={{ border: 0, borderRadius: "10px", padding: "0 18px", background: colors.accent, color: "white", fontWeight: 700, cursor: "pointer" }}>{loadingRestore ? "Restoring..." : "Restore"}</button>
                                </div>
                            ) : <div style={cardStyle}>No cloud backups available yet.</div>}
                        </>
                    )}

                    {activeSection === "settings" && (
                        <>
                            <h3 style={{ color: "#aeb8ff", margin: "0 0 18px" }}>Current Settings</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
                                {Object.entries(settings).map(([key, value]) => <div key={key} style={cardStyle}><small style={{ color: colors.muted, fontWeight: 700 }}>{key.toUpperCase()}</small><div style={{ marginTop: "7px", fontWeight: 700 }}>{String(value)}</div></div>)}
                            </div>
                            <button onClick={() => handleCloudBackup("settings")} disabled={loadingBackup} style={{ ...actionStyle, marginTop: "20px" }}><Action icon="⚙️" title={loadingBackup ? "Saving..." : "Backup Settings"} subtitle="Save your current settings to the cloud" /></button>
                            <button onClick={handleCloudRestore} disabled={!selectedBackup || loadingRestore} style={{ ...actionStyle, marginTop: "14px" }}><Action icon="🔄" title="Restore Settings" subtitle="Apply settings from your last cloud backup" /></button>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ width: "54px", height: "54px", display: "grid", placeItems: "center", borderRadius: "14px", background: "rgba(93, 91, 205, .2)", border: "1px solid rgba(120, 115, 255, .5)", fontSize: "25px" }}>{icon}</div>
            <div><div style={{ color: colors.muted, fontSize: "14px", fontWeight: 700 }}>{label}</div><div style={{ fontSize: "30px", fontWeight: 800, marginTop: "4px" }}>{value}</div></div>
        </div>
    );
}

function Action({ icon, title, subtitle }) {
    return <div style={{ display: "flex", alignItems: "center", gap: "18px" }}><span style={{ fontSize: "28px" }}>{icon}</span><span><strong style={{ display: "block", fontSize: "18px" }}>{title}</strong><small style={{ color: colors.muted, display: "block", marginTop: "5px" }}>{subtitle}</small></span></div>;
}
