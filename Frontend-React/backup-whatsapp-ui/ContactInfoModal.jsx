import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMutualGroups, reportUser, fetchUserProfile } from '../services/api';

export default function ContactInfoModal({
    contact,
    isOnline,
    lastSeenText,
    isBlocked,
    onToggleBlock,
    onClose,
    onOpenPhotoViewer
}) {
    const { token } = useAuth();
    const [profile, setProfile] = useState(contact);
    const [mutualGroups, setMutualGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [showReportInput, setShowReportInput] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reporting, setReporting] = useState(false);
    const [reportMsg, setReportMsg] = useState("");

    const targetEmail = contact?.email;

    useEffect(() => {
        if (!targetEmail || !token) return;

        fetchUserProfile(token, targetEmail)
            .then(res => {
                if (res?.user) {
                    setProfile(prev => ({ ...prev, ...res.user }));
                }
            })
            .catch(() => {});

        fetchMutualGroups(token, targetEmail)
            .then(groups => {
                if (Array.isArray(groups)) {
                    setMutualGroups(groups);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingGroups(false));
    }, [targetEmail, token]);

    const handleReport = async (e) => {
        e.preventDefault();
        if (!reportReason.trim()) {
            alert("Please provide a reason for reporting");
            return;
        }
        setReporting(true);
        try {
            const res = await reportUser(token, targetEmail, reportReason);
            if (res?.report || res?.message?.includes("success")) {
                setReportMsg("User reported. Our safety team will review this account.");
                setShowReportInput(false);
                setReportReason("");
            } else {
                alert(res?.message || "Failed to submit report");
            }
        } catch (err) {
            alert("Error reporting user: " + err.message);
        } finally {
            setReporting(false);
        }
    };

    const initials = (profile?.name || "?").slice(0, 2).toUpperCase();

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 20, 26, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: "#111b21",
                color: "#e9edef",
                borderRadius: "14px",
                width: "90%",
                maxWidth: "430px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                border: "1px solid rgba(134,150,160,0.15)",
                overflow: "hidden"
            }} onClick={(e) => e.stopPropagation()}>

                {/* WhatsApp Web Green Header Bar */}
                <div style={{
                    background: "#008069",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "white"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "17px", fontWeight: "600" }}>
                        <span>ℹ️</span>
                        <span>Contact Info</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            fontSize: "18px",
                            cursor: "pointer",
                            padding: "4px"
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: "24px" }}>
                    {reportMsg && (
                        <div style={{
                            background: "rgba(0,168,132,0.2)",
                            border: "1px solid #00a884",
                            color: "#00a884",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            textAlign: "center",
                            marginBottom: "16px"
                        }}>
                            {reportMsg}
                        </div>
                    )}

                    {/* Avatar & Online status */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "22px" }}>
                        <div 
                            onClick={() => profile?.photo && onOpenPhotoViewer && onOpenPhotoViewer(profile.photo, profile.name)}
                            style={{
                                width: "110px",
                                height: "110px",
                                borderRadius: "50%",
                                background: "#202c33",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "36px",
                                fontWeight: "bold",
                                overflow: "hidden",
                                cursor: profile?.photo ? "pointer" : "default",
                                border: `3px solid ${isOnline ? "#00a884" : "#8696a0"}`,
                                marginBottom: "12px"
                            }}
                            title={profile?.photo ? "Click to view full photo" : ""}
                        >
                            {profile?.photo ? (
                                <img src={profile.photo} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : initials}
                        </div>

                        <h3 style={{ margin: "2px 0 6px 0", fontSize: "20px", color: "#e9edef", fontWeight: "500" }}>
                            {profile?.name}
                        </h3>
                        
                        <div style={{
                            fontSize: "13px",
                            color: isOnline ? "#00a884" : "#8696a0",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: isOnline ? "600" : "400"
                        }}>
                            <span style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: isOnline ? "#00a884" : "#8696a0",
                                display: "inline-block"
                            }} />
                            {isOnline ? "Active now" : (lastSeenText || "Offline")}
                        </div>
                    </div>

                    {/* WhatsApp Details Section */}
                    <div style={{
                        background: "#202c33",
                        borderRadius: "10px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        marginBottom: "18px",
                        border: "1px solid rgba(134,150,160,0.12)"
                    }}>
                        <div>
                            <div style={{ fontSize: "11px", color: "#00a884", fontWeight: "600", textTransform: "uppercase" }}>ABOUT</div>
                            <div style={{ fontSize: "14px", color: "#e9edef", marginTop: "4px", whiteSpace: "pre-wrap" }}>
                                {profile?.about || "Hey there! I am using WhatsApp."}
                            </div>
                        </div>

                        <div style={{ height: "1px", background: "rgba(134,150,160,0.1)" }} />

                        <div>
                            <div style={{ fontSize: "11px", color: "#8696a0", fontWeight: "600", textTransform: "uppercase" }}>PHONE NUMBER</div>
                            <div style={{ fontSize: "14px", color: "#e9edef", marginTop: "4px" }}>
                                {profile?.phone || "Not provided"}
                            </div>
                        </div>

                        <div style={{ height: "1px", background: "rgba(134,150,160,0.1)" }} />

                        <div>
                            <div style={{ fontSize: "11px", color: "#8696a0", fontWeight: "600", textTransform: "uppercase" }}>EMAIL</div>
                            <div style={{ fontSize: "14px", color: "#e9edef", marginTop: "4px" }}>
                                {profile?.email}
                            </div>
                        </div>
                    </div>

                    {/* Mutual Groups */}
                    <div style={{
                        background: "#202c33",
                        borderRadius: "10px",
                        padding: "16px",
                        marginBottom: "18px",
                        border: "1px solid rgba(134,150,160,0.12)"
                    }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#e9edef", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                            <span>👥 Groups in common</span>
                            <span style={{ color: "#00a884" }}>{mutualGroups.length}</span>
                        </div>
                        {loadingGroups ? (
                            <div style={{ fontSize: "13px", color: "#8696a0" }}>Loading mutual groups...</div>
                        ) : mutualGroups.length === 0 ? (
                            <div style={{ fontSize: "13px", color: "#8696a0" }}>No groups in common</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "120px", overflowY: "auto" }}>
                                {mutualGroups.map(g => (
                                    <div key={g._id} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 10px",
                                        background: "#111b21",
                                        borderRadius: "6px",
                                        fontSize: "13px"
                                    }}>
                                        <span style={{ fontSize: "16px" }}>{g.photo ? "📷" : "👥"}</span>
                                        <span style={{ fontWeight: "500", color: "#e9edef" }}>{g.name}</span>
                                        <span style={{ marginLeft: "auto", fontSize: "11px", color: "#8696a0" }}>
                                            {g.members?.length} members
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions: Block / Unblock & Report */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                            onClick={onToggleBlock}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "20px",
                                border: isBlocked ? "1px solid #00a884" : "1px solid rgba(239,68,68,0.4)",
                                background: isBlocked ? "rgba(0,168,132,0.15)" : "transparent",
                                color: isBlocked ? "#00a884" : "#f87171",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "13px"
                            }}
                        >
                            {isBlocked ? "🔓 Unblock contact" : "🚫 Block contact"}
                        </button>

                        {!showReportInput ? (
                            <button
                                onClick={() => setShowReportInput(true)}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "20px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                    fontSize: "13px"
                                }}
                            >
                                ⚠️ Report contact
                            </button>
                        ) : (
                            <form onSubmit={handleReport} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                                <input 
                                    type="text"
                                    placeholder="Reason for report (e.g. spam)..."
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid rgba(134,150,160,0.25)",
                                        background: "#202c33",
                                        color: "#e9edef",
                                        fontSize: "13px",
                                        outline: "none"
                                    }}
                                />
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowReportInput(false)}
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            borderRadius: "16px",
                                            border: "1px solid rgba(134,150,160,0.25)",
                                            background: "transparent",
                                            color: "#e9edef",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={reporting}
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            borderRadius: "16px",
                                            border: "none",
                                            background: "#ef4444",
                                            color: "white",
                                            cursor: reporting ? "not-allowed" : "pointer",
                                            fontWeight: "600",
                                            fontSize: "12px"
                                        }}
                                    >
                                        {reporting ? "Reporting..." : "Submit Report"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
