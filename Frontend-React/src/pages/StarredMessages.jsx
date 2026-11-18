import { useEffect, useState } from "react";
import { fetchStarredMessages } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StarredMessages() {
    const { token } = useAuth();
    const [messages, setMessages] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadMessages = async () => {
            try {
                const data = await fetchStarredMessages(token);
                setMessages(Array.isArray(data) ? data : []);
            } catch {
                setMessages([]);
            }
        };
        loadMessages();
    }, [token]);

    return (
        <div style={{
            minHeight: "100vh",
            width: "100vw",
            backgroundColor: "#ece7e1",
            padding: "24px",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "680px",
                background: "#ffffff",
                borderRadius: "24px",
                padding: "32px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.07), 0 0 1px 1px rgba(0, 0, 0, 0.03)",
                border: "1px solid #f0ece6"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button 
                            onClick={() => navigate("/chat")}
                            style={{
                                padding: "8px 14px",
                                cursor: "pointer",
                                background: "#f5f1eb",
                                color: "#18181b",
                                border: "1px solid #e4ded7",
                                borderRadius: "10px",
                                fontWeight: 600,
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            ← Back to Chat
                        </button>
                        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#18181b" }}>
                            ⭐ Starred Messages
                        </h2>
                    </div>
                    <span style={{ fontSize: "13px", color: "#71717a", fontWeight: 600 }}>
                        {messages.length} saved
                    </span>
                </div>

                {messages.length === 0 ? (
                    <div style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "#71717a",
                        background: "#faf8f5",
                        borderRadius: "16px",
                        border: "1px dashed #e4ded7"
                    }}>
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>⭐</div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>No starred messages yet</p>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#a1a1aa" }}>Star messages in conversations to bookmark them here</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {messages.map(msg => (
                            <div
                                key={msg._id}
                                style={{
                                    background: "#faf8f5",
                                    padding: "16px",
                                    borderRadius: "14px",
                                    border: "1px solid #f0ece6",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <strong style={{ fontSize: "14px", color: "#18181b" }}>{msg.from}</strong>
                                    {msg.createdAt && (
                                        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: "14px", color: "#3f3f46", lineHeight: 1.5 }}>
                                    {msg.message}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
