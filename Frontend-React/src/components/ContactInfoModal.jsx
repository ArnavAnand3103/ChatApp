import { useEffect, useState } from "react";
import {
    backupChat,
    fetchMutualGroups,
    fetchUserProfile,
    reportUser,
    toggleBlockUser,
    updateProfile
} from "../services/api";
import ProfileAvatar from "./ProfileAvatar";
import { useAuth } from "../context/AuthContext";

export default function ContactInfoModal({
    contact,
    isOnline,
    lastSeenText,
    isBlocked,
    onBlockedChange,
    onOpenPhotoViewer,
    onMessage,
    onSearch,
    onClose,
    canEditAbout = false
}) {
    const { token } = useAuth();
    const [profile, setProfile] = useState(contact);
    const [groups, setGroups] = useState([]);
    const [reportReason, setReportReason] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [message, setMessage] = useState("");
    const [sharedMedia, setSharedMedia] = useState([]);
    const [editingAbout, setEditingAbout] = useState(false);
    const [aboutDraft, setAboutDraft] = useState(contact?.about || "");
    const [savingAbout, setSavingAbout] = useState(false);

    useEffect(() => {
        if (!contact?.email) return;
        Promise.all([
            fetchUserProfile(token, contact.email),
            fetchMutualGroups(token, contact.email),
            backupChat(token, { withUser: contact.email })
        ]).then(([profileData, groupData, backup]) => {
            if (profileData?.user) setProfile((current) => ({ ...current, ...profileData.user }));
            if (Array.isArray(groupData)) setGroups(groupData);
            if (Array.isArray(backup?.messages)) setSharedMedia(backup.messages.filter((item) => item.mediaUrl));
        }).catch(() => setMessage("Unable to load contact details."));
    }, [contact?.email, token]);

    useEffect(() => {
        setAboutDraft(profile.about || "");
    }, [profile.about]);

    const handleSaveAbout = async () => {
        setSavingAbout(true);
        try {
            const result = await updateProfile(token, { about: aboutDraft.trim() });
            if (!result?.user) {
                setMessage(result?.message || "Unable to update About.");
                return;
            }
            setProfile((current) => ({ ...current, about: result.user.about || "" }));
            setEditingAbout(false);
            setMessage("About updated.");
        } catch (error) {
            setMessage(`Unable to update About: ${error.message}`);
        } finally {
            setSavingAbout(false);
        }
    };

    const handleBlock = async () => {
        if (!window.confirm(isBlocked ? "Unblock this contact?" : "Block this contact?")) return;
        const result = await toggleBlockUser(token, contact.email);
        if (typeof result.blocked === "boolean") {
            onBlockedChange?.(result.blocked);
            setMessage(result.blocked ? "Contact blocked." : "Contact unblocked.");
        }
    };

    const handleReport = async (event) => {
        event.preventDefault();
        if (!reportReason.trim()) return;
        const result = await reportUser(token, contact.email, reportReason.trim());
        setMessage(result?.message || "Report submitted.");
        setReportReason("");
        setShowReport(false);
    };

    return (
        <div onClick={onClose} style={styles.overlay}>
            <section onClick={(event) => event.stopPropagation()} style={styles.modal}>
                <header style={styles.header}>
                    <strong>Contact Info</strong>
                    <button onClick={onClose} style={styles.close}>×</button>
                </header>
                <div style={styles.body}>
                    <button
                        onClick={() => profile.photo && onOpenPhotoViewer?.(profile.photo, profile.name)}
                        style={styles.avatarButton}
                        title={profile.photo ? "View profile photo" : "No profile photo"}
                    >
                        <ProfileAvatar name={profile.name} photo={profile.photo} size={112} />
                    </button>
                    <h2 style={{ margin: "10px 0 4px" }}>{profile.name}</h2>
                    <div style={{ color: isOnline ? "#61e294" : "#9ca7bd" }}>
                        {isOnline ? "Active now" : (lastSeenText || "Offline")}
                    </div>
                    <div style={styles.card}>
                        <div style={{ marginBottom: "12px" }}>
                            <div style={styles.infoLabel}>ABOUT</div>
                            {editingAbout ? (
                                <>
                                    <textarea
                                        value={aboutDraft}
                                        onChange={(event) => setAboutDraft(event.target.value.slice(0, 160))}
                                        rows={3}
                                        maxLength={160}
                                        style={styles.input}
                                    />
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                        <button onClick={handleSaveAbout} disabled={savingAbout} style={styles.primary}>
                                            {savingAbout ? "Saving..." : "Save"}
                                        </button>
                                        <button onClick={() => setEditingAbout(false)} disabled={savingAbout} style={styles.action}>Cancel</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>{profile.about || "No bio available"}</div>
                                    {canEditAbout && <button onClick={() => setEditingAbout(true)} style={styles.edit}>Edit About</button>}
                                </>
                            )}
                        </div>
                        <Info label="EMAIL" value={profile.email} />
                        {profile.phone && <Info label="PHONE" value={profile.phone} />}
                    </div>
                    {!canEditAbout && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <button onClick={onMessage} style={styles.primary}>Message</button>
                            <button onClick={onSearch} style={styles.action}>Search Chat</button>
                        </div>
                    )}
                    {sharedMedia.length > 0 && (
                        <div style={styles.card}>
                            <strong>Shared Media ({sharedMedia.length})</strong>
                            <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "10px" }}>
                                {sharedMedia.slice(0, 8).map((item) => item.messageType === "image" || item.messageType === "media" ? (
                                    <img key={item._id || item.clientMessageId} src={item.mediaUrl} alt={item.fileName || "Shared media"} style={{ width: "58px", height: "58px", objectFit: "cover", borderRadius: "8px" }} />
                                ) : <span key={item._id || item.clientMessageId} style={{ padding: "16px 8px", background: "#10203d", borderRadius: "8px" }}>📎</span>)}
                            </div>
                        </div>
                    )}
                    {groups.length > 0 && (
                        <div style={styles.card}>
                            <strong>Mutual Groups</strong>
                            {groups.map((group) => <div key={group._id} style={{ padding: "10px 0", color: "#c5caff" }}>👥 {group.name}</div>)}
                        </div>
                    )}
                    {message && <div style={{ color: "#75e3a0", marginBottom: "12px" }}>{message}</div>}
                    {!canEditAbout && <button onClick={handleBlock} style={styles.action}>{isBlocked ? "Unblock User" : "Block User"}</button>}
                    {!canEditAbout && <button onClick={() => setShowReport((value) => !value)} style={styles.action}>Report User</button>}
                    {!canEditAbout && showReport && (
                        <form onSubmit={handleReport} style={{ display: "grid", gap: "8px" }}>
                            <textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Reason for report" rows={3} style={styles.input} />
                            <button type="submit" style={styles.primary}>Submit Report</button>
                        </form>
                    )}
                </div>
            </section>
        </div>
    );
}

function Info({ label, value }) {
    return <div style={{ marginTop: "12px" }}><small style={{ color: "#8995af", fontWeight: 700 }}>{label}</small><div style={{ marginTop: "4px" }}>{value}</div></div>;
}

const styles = {
    overlay: { position: "fixed", inset: 0, zIndex: 1000000, display: "grid", placeItems: "center", background: "rgba(4, 8, 24, .78)", backdropFilter: "blur(4px)", padding: "18px" },
    modal: { width: "min(440px, 94vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: "18px", background: "#172746", color: "#f4f5ff", border: "1px solid rgba(133,164,220,.25)" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid rgba(133,164,220,.2)", fontSize: "18px" },
    close: { border: 0, background: "transparent", color: "white", fontSize: "26px", cursor: "pointer" },
    body: { padding: "24px", textAlign: "center" },
    avatarButton: { border: 0, background: "transparent", cursor: "pointer" },
    card: { textAlign: "left", padding: "15px", margin: "18px 0", borderRadius: "12px", background: "rgba(33,55,91,.8)" },
    action: { width: "100%", padding: "12px", marginTop: "8px", borderRadius: "10px", border: "1px solid rgba(133,164,220,.25)", background: "#21375b", color: "white", cursor: "pointer" },
    primary: { padding: "10px", border: 0, borderRadius: "8px", background: "#5b62e8", color: "white", fontWeight: 700 },
    input: { resize: "vertical", borderRadius: "8px", border: "1px solid rgba(133,164,220,.3)", background: "#10203d", color: "white", padding: "10px" }
};
