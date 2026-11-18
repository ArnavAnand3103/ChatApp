import { useEffect, useState } from 'react';
import { fetchCallHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CallHistoryModal({ selectedUser, onClose }) {
    const { token, user } = useAuth();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCurrent, setFilterCurrent] = useState(!!selectedUser && !selectedUser?.isGroup);

    useEffect(() => {
        loadHistory();
    }, [filterCurrent, selectedUser]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const target = (filterCurrent && selectedUser && !selectedUser.isGroup) ? selectedUser.email : "";
            const data = await fetchCallHistory(token, target);
            if (Array.isArray(data)) {
                setCalls(data);
            } else {
                setCalls([]);
            }
        } catch (err) {
            console.error("Failed to load call history:", err);
            setCalls([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (start, end) => {
        if (!start || !end) return "";
        const diffMs = new Date(end) - new Date(start);
        if (diffMs <= 0) return "";
        const totalSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(4px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999999
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1f232a",
                    color: "white",
                    borderRadius: "14px",
                    width: "440px",
                    maxWidth: "92vw",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    overflow: "hidden"
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "600" }}>
                        <span>📞</span>
                        <span>Call History {selectedUser ? `(${selectedUser.name})` : ""}</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#aaa",
                            fontSize: "20px",
                            cursor: "pointer",
                            padding: "4px 8px"
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Filter toggle if in private chat */}
                {selectedUser && !selectedUser.isGroup && (
                    <div style={{ display: "flex", padding: "10px 20px", gap: "10px", background: "#16191f" }}>
                        <button
                            onClick={() => setFilterCurrent(true)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: "20px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                                background: filterCurrent ? "#5865F2" : "#2a2f3a",
                                color: "white"
                            }}
                        >
                            With {selectedUser.name}
                        </button>
                        <button
                            onClick={() => setFilterCurrent(false)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: "20px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                                background: !filterCurrent ? "#5865F2" : "#2a2f3a",
                                color: "white"
                            }}
                        >
                            All Calls
                        </button>
                    </div>
                )}

                {/* Call List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "#8e9297" }}>
                            Loading call history...
                        </div>
                    ) : calls.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "#8e9297" }}>
                            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                            <div>No calls recorded yet.</div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {calls.map((call) => {
                                const isOutgoing = call.caller === user.email;
                                const otherParty = isOutgoing ? call.receiver : call.caller;
                                const duration = formatDuration(call.startedAt, call.endedAt);
                                const isMissed = call.status === "missed";
                                const isRejected = call.status === "rejected";
                                const isCompleted = call.status === "completed";

                                return (
                                    <div
                                        key={call._id}
                                        style={{
                                            padding: "12px 14px",
                                            background: "rgba(255,255,255,0.03)",
                                            borderRadius: "10px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            borderLeft: `4px solid ${
                                                isCompleted ? "#2ecc71" : isMissed ? "#e74c3c" : "#f39c12"
                                            }`
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div
                                                style={{
                                                    fontSize: "20px",
                                                    width: "38px",
                                                    height: "38px",
                                                    borderRadius: "50%",
                                                    background: "rgba(255,255,255,0.06)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                {call.type === "video" ? "📹" : "📞"}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: "600", fontSize: "14px" }}>
                                                    {otherParty}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#8e9297", display: "flex", gap: "6px", alignItems: "center" }}>
                                                    <span>{isOutgoing ? "↗ Outgoing" : "↙ Incoming"}</span>
                                                    <span>•</span>
                                                    <span>{new Date(call.createdAt || call.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: isCompleted ? "#2ecc71" : isMissed ? "#e74c3c" : "#f39c12",
                                                    textTransform: "capitalize"
                                                }}
                                            >
                                                {call.status}
                                            </div>
                                            {duration && (
                                                <div style={{ fontSize: "11px", color: "#8e9297", marginTop: "2px" }}>
                                                    {duration}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "8px",
                            background: "#2a2f3a",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "14px"
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

