import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const navigate = useNavigate();
    const { token } = useAuth();

    return (
        <div style={{
            minHeight: "100vh",
            width: "100vw",
            background: "#111b21",
            color: "#e9edef",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* WhatsApp Top Green Header Bar */}
            <div style={{
                height: "220px",
                width: "100%",
                background: "#00a884",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 0
            }} />

            {/* Header Content */}
            <header style={{
                position: "relative",
                zIndex: 1,
                padding: "24px 40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                maxWidth: "1100px",
                margin: "0 auto",
                width: "100%"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* WhatsApp SVG Logo */}
                    <svg viewBox="0 0 40 40" width="38" height="38" fill="white">
                        <path d="M20 2C10.06 2 2 10.06 2 20c0 3.53 1.02 6.82 2.8 9.61L3 37l7.63-1.76C13.33 36.85 16.53 38 20 38c9.94 0 18-8.06 18-18S29.94 2 20 2zm9.89 25.13c-.41 1.16-2.04 2.12-3.32 2.39-.88.18-2.03.32-5.88-1.28-4.93-2.05-8.11-7.07-8.36-7.4-.24-.33-2-2.67-2-5.09s1.26-3.61 1.72-4.11c.46-.49 1-.61 1.34-.61.34 0 .68 0 .97.02.31.01.73-.12 1.14.88.42 1.02 1.44 3.51 1.57 3.77.13.25.21.55.05.88-.17.33-.25.54-.5.83-.25.29-.53.65-.75.87-.25.25-.51.52-.22 1.02.29.49 1.28 2.12 2.76 3.43 1.9 1.69 3.5 2.22 4 2.47.49.25.78.21 1.07-.12.29-.33 1.25-1.46 1.58-1.96.33-.5.67-.42 1.13-.25.46.17 2.92 1.38 3.42 1.63.5.25.84.37.96.58.13.21.13 1.21-.28 2.37z" />
                    </svg>
                    <span style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        color: "white"
                    }}>
                        WHATSAPP WEB
                    </span>
                </div>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "13px"
                }}>
                    <span>🔒 End-to-end encrypted</span>
                </div>
            </header>

            {/* Central WhatsApp Card */}
            <main style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
            }}>
                <div style={{
                    background: "#202c33",
                    borderRadius: "16px",
                    boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
                    border: "1px solid rgba(134,150,160,0.15)",
                    width: "100%",
                    maxWidth: "880px",
                    display: "flex",
                    flexDirection: "row",
                    overflow: "hidden"
                }}>
                    {/* Left Column: Information & Actions */}
                    <div style={{
                        flex: 1.2,
                        padding: "48px 44px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}>
                        <div style={{
                            display: "inline-block",
                            background: "rgba(0,168,132,0.15)",
                            color: "#00a884",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                            marginBottom: "16px",
                            width: "fit-content"
                        }}>
                            SIMPLE. RELIABLE. PRIVATE.
                        </div>

                        <h1 style={{
                            fontSize: "32px",
                            fontWeight: "300",
                            color: "#e9edef",
                            marginBottom: "14px",
                            lineHeight: "1.25"
                        }}>
                            Use WhatsApp on your computer
                        </h1>

                        <p style={{
                            fontSize: "15px",
                            color: "#8696a0",
                            lineHeight: "1.5",
                            marginBottom: "28px"
                        }}>
                            Send and receive messages, media, location, and voice notes. Stay connected with friends and groups with end-to-end encryption.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#d1d7db", fontSize: "14px" }}>
                                <span style={{ color: "#00a884", fontSize: "18px" }}>💬</span>
                                <span>Real-time private & group messaging</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#d1d7db", fontSize: "14px" }}>
                                <span style={{ color: "#00a884", fontSize: "18px" }}>📞</span>
                                <span>Voice & video calling with screen share</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#d1d7db", fontSize: "14px" }}>
                                <span style={{ color: "#00a884", fontSize: "18px" }}>🤖</span>
                                <span>Built-in AI Assistant powered by Groq</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                            <button
                                onClick={() => navigate(token ? "/chat" : "/login")}
                                style={{
                                    background: "#00a884",
                                    color: "#111b21",
                                    border: "none",
                                    padding: "12px 28px",
                                    borderRadius: "24px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    boxShadow: "0 2px 8px rgba(0,168,132,0.3)"
                                }}
                            >
                                <span>Get Started</span>
                                <span>→</span>
                            </button>

                            {!token && (
                                <button
                                    onClick={() => navigate("/signup")}
                                    style={{
                                        background: "transparent",
                                        color: "#00a884",
                                        border: "1px solid #00a884",
                                        padding: "12px 24px",
                                        borderRadius: "24px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    Create Account
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: WhatsApp Graphic / Mockup */}
                    <div style={{
                        flex: 0.9,
                        background: "#111b21",
                        borderLeft: "1px solid rgba(134,150,160,0.15)",
                        padding: "40px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center"
                    }}>
                        {/* WhatsApp Laptop Graphic */}
                        <div style={{
                            width: "160px",
                            height: "160px",
                            borderRadius: "50%",
                            background: "rgba(0,168,132,0.1)",
                            border: "2px solid rgba(0,168,132,0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "20px"
                        }}>
                            <svg viewBox="0 0 64 64" width="80" height="80" fill="#00a884">
                                <path d="M52 44V14a2 2 0 0 0-2-2H14a2 2 0 0 0-2 2v30a2 2 0 0 0 2 2h36a2 2 0 0 0 2-2zM16 16h32v24H16V16zm44 34H4a2 2 0 0 0 0 4h56a2 2 0 0 0 0-4z"/>
                            </svg>
                        </div>

                        <h3 style={{ fontSize: "18px", color: "#e9edef", marginBottom: "8px", fontWeight: "500" }}>
                            WhatsApp Web
                        </h3>
                        <p style={{ fontSize: "13px", color: "#8696a0", maxWidth: "260px", lineHeight: "1.4" }}>
                            Link up to 4 devices to stay connected anytime, anywhere.
                        </p>

                        <div style={{
                            marginTop: "24px",
                            padding: "8px 14px",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#8696a0",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}>
                            <span>🔒</span>
                            <span>End-to-end encrypted</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                padding: "16px",
                fontSize: "13px",
                color: "#667781"
            }}>
                WhatsApp Clone • Secure, Real-time Messaging
            </footer>
        </div>
    );
}
