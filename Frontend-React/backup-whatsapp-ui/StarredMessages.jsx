import { useEffect, useState } from "react";
import { fetchStarredMessages } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StarredMessages() {
    const { token } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadMessages = async () => {
            try {
                const data = await fetchStarredMessages(token);
                setMessages(Array.isArray(data) ? data : []);
            } catch {
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };
        loadMessages();
    }, [token]);

    return (
        <div style={{
            minHeight: "100vh",
            width: "100vw",
            background: "#111b21",
            color: "#e9edef",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* WhatsApp Header */}
            <header style={{
                height: "60px",
                background: "#008069",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                gap: "16px",
                color: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}>
                <button 
                    onClick={() => navigate("/chat")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "white",
                        fontSize: "20px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                    }}
                    title="Back to chat"
                >
                    ←
                </button>
                <div style={{ fontSize: "18px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⭐</span>
                    <span>Starred Messages</span>
                </div>
            </header>

            {/* Content */}
            <main style={{
                flex: 1,
                maxWidth: "760px",
                margin: "0 auto",
                width: "100%",
                padding: "24px 20px"
            }}>
                {loading ? (
                    <div style={{ textAlign: "center", color: "#8696a0", marginTop: "40px" }}>
                        Loading starred messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        color: "#8696a0",
                        marginTop: "80px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "12px"
                    }}>
                        <div style={{ fontSize: "48px" }}>⭐</div>
                        <div style={{ fontSize: "18px", color: "#e9edef", fontWeight: "500" }}>No starred messages</div>
                        <div style={{ fontSize: "14px", maxWidth: "320px", lineHeight: "1.4" }}>
                            Right-click or hold any message in a chat and select "Star" to save it here for easy reference.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {messages.map(msg => (
                            <div
                                key={msg._id}
                                style={{
                                    background: "#202c33",
                                    padding: "14px 18px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(134,150,160,0.12)",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "8px"
                                }}>
                                    <span style={{ fontWeight: "600", color: "#00a884", fontSize: "14px" }}>
                                        {msg.from}
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#8696a0" }}>
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                    </span>
                                </div>

                                <div style={{ fontSize: "14.5px", color: "#e9edef", lineHeight: "1.4" }}>
                                    {msg.message}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
