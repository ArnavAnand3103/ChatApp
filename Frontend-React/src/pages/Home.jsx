import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const videoRef = useRef(null);

    // ── Video Intro Animation State ──────────────────────────────────────────
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [animComplete, setAnimComplete] = useState(false);
    const [activeTab, setActiveTab] = useState('chat');
    const [aiQueryIndex, setAiQueryIndex] = useState(0);
    const [callMuted, setCallMuted] = useState(false);
    const [cameraActive, setCameraActive] = useState(true);
    const [reactionCount, setReactionCount] = useState({ heart: 12, fire: 8, thumbs: 5 });
    const [userReacted, setUserReacted] = useState(null);

    // Run the perimeter percentage counter (0% -> 100%) like the video
    useEffect(() => {
        let current = 0;
        const interval = setInterval(() => {
            current += 2;
            if (current >= 100) {
                current = 100;
                setLoadingProgress(100);
                clearInterval(interval);
                setTimeout(() => setAnimComplete(true), 400);
            } else {
                setLoadingProgress(current);
            }
        }, 30);
        return () => clearInterval(interval);
    }, []);

    const replayAnimation = () => {
        setAnimComplete(false);
        setLoadingProgress(0);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
        }
        let current = 0;
        const interval = setInterval(() => {
            current += 3;
            if (current >= 100) {
                current = 100;
                setLoadingProgress(100);
                clearInterval(interval);
                setTimeout(() => setAnimComplete(true), 400);
            } else {
                setLoadingProgress(current);
            }
        }, 25);
    };

    // AI Demo Prompts
    const aiPrompts = [
        {
            query: "Analyze our project timeline and extract action items",
            response: "✦ Action Items Extracted:\n1. Complete WebRTC signaling handshake (Due: Friday)\n2. Run audit on Signal Pre-Key bundles\n3. Deploy MongoDB Atlas backup replica"
        },
        {
            query: "Generate a futuristic cyberpunk avatar for my profile",
            response: "🎨 Generated with HuggingFace Diffusion:\nHigh-resolution cyberpunk neon avatar rendered with glowing visor and holographic background."
        },
        {
            query: "What was discussed in yesterday's team sync about E2EE?",
            response: "🔒 RAG Context:\nAlice and Bob agreed to enforce Double Ratchet with post-quantum Kyber pre-keys on all desktop sessions."
        }
    ];

    const handleReaction = (type) => {
        if (userReacted === type) {
            setReactionCount(prev => ({ ...prev, [type]: prev[type] - 1 }));
            setUserReacted(null);
        } else {
            setReactionCount(prev => ({
                ...prev,
                [type]: prev[type] + 1,
                ...(userReacted ? { [userReacted]: prev[userReacted] - 1 } : {})
            }));
            setUserReacted(type);
        }
    };

    const handleGetStarted = () => {
        if (token) navigate('/chat');
        else navigate('/login');
    };

    const handleSignUp = () => {
        if (token) navigate('/chat');
        else navigate('/signup');
    };

    return (
        <div style={{
            minHeight: "100vh",
            width: "100%",
            backgroundColor: "#0d1b2a",
            color: "#f8fafc",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            overflowX: "hidden",
            position: "relative"
        }}>
            {/* ── Atmospheric Hero Section (Video Style) ────────────────────────── */}
            <div style={{
                position: "relative",
                width: "100vw",
                minHeight: "100vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "24px",
                boxSizing: "border-box"
            }}>
                {/* Background Video Layer playing user's animation video */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    overflow: "hidden"
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        loop
                        muted
                        playsInline
                        src="/hero-animation.mp4"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            filter: "brightness(0.9) contrast(1.05)",
                            display: "block"
                        }}
                    />
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg, rgba(13, 27, 42, 0.25) 0%, rgba(13, 27, 42, 0.1) 40%, rgba(13, 27, 42, 0.85) 100%)",
                        pointerEvents: "none"
                    }} />
                </div>

                {/* ── Animated Rounded Frame Stroke & Percentage Counter ─────────── */}
                <div style={{
                    position: "absolute",
                    inset: "20px",
                    borderRadius: "32px",
                    border: "1.5px solid rgba(255, 255, 255, 0.28)",
                    pointerEvents: "none",
                    zIndex: 10,
                    boxShadow: "inset 0 0 40px rgba(255, 255, 255, 0.03)"
                }}>
                    {/* Corner accents */}
                    <div style={{
                        position: "absolute",
                        bottom: "32px",
                        left: "36px",
                        fontSize: "clamp(36px, 6vw, 72px)",
                        fontWeight: 300,
                        color: "rgba(255, 255, 255, 0.45)",
                        letterSpacing: "-1px",
                        opacity: animComplete ? 0 : 1,
                        transition: "opacity 0.6s ease",
                        fontFamily: "monospace"
                    }}>
                        {loadingProgress}%
                    </div>
                </div>

                {/* ── Navigation Bar (Fades in on completion) ────────────────────── */}
                <header style={{
                    position: "relative",
                    zIndex: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 32px",
                    opacity: animComplete ? 1 : 0.2,
                    transform: animComplete ? "translateY(0)" : "translateY(-10px)",
                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
                }}>
                    {/* Brand Logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => navigate('/')}>
                        <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 10px rgba(245, 158, 11, 0.5)"
                        }}>
                            <span style={{ fontSize: "14px", color: "white" }}>✦</span>
                        </div>
                        <span style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", color: "white" }}>
                            Project2 <span style={{ fontWeight: 400, opacity: 0.85 }}>Chat</span>
                        </span>
                    </div>

                    {/* Navigation Links */}
                    <nav style={{ display: "flex", alignItems: "center", gap: "32px" }}>
                        {["Features", "Security", "AI Hub", "Calling"].map((link) => (
                            <a
                                key={link}
                                href={`#${link.toLowerCase()}`}
                                style={{
                                    color: "rgba(255, 255, 255, 0.85)",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    transition: "color 0.2s"
                                }}
                                onMouseEnter={e => e.target.style.color = "white"}
                                onMouseLeave={e => e.target.style.color = "rgba(255, 255, 255, 0.85)"}
                            >
                                {link}
                            </a>
                        ))}
                    </nav>

                    {/* Action Button */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                            onClick={replayAnimation}
                            title="Replay intro animation"
                            style={{
                                background: "rgba(255, 255, 255, 0.12)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                color: "white",
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                cursor: "pointer",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            ↺
                        </button>

                        <button
                            onClick={handleGetStarted}
                            style={{
                                padding: "10px 24px",
                                borderRadius: "20px",
                                border: "none",
                                background: "white",
                                color: "#0f172a",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                                transition: "transform 0.15s ease"
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                            {token ? "Open Chat" : "Get Started"}
                        </button>
                    </div>
                </header>

                {/* ── Main Hero Content Area ────────────────────────────────────────── */}
                <div style={{
                    position: "relative",
                    zIndex: 20,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    padding: "40px 36px 40px",
                    flexWrap: "wrap",
                    gap: "32px",
                    opacity: animComplete ? 1 : 0.3,
                    transform: animComplete ? "translateY(0)" : "translateY(16px)",
                    transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s"
                }}>
                    {/* Left: Huge Elegant Display Headline */}
                    <div style={{ maxWidth: "620px" }}>
                        <h1 style={{
                            fontSize: "clamp(42px, 6vw, 84px)",
                            fontWeight: 800,
                            lineHeight: 1.05,
                            letterSpacing: "-2px",
                            margin: "0 0 24px 0",
                            color: "white"
                        }}>
                            Next-Gen Chat.<br />
                            <span style={{ fontWeight: 300, color: "rgba(255, 255, 255, 0.88)" }}>
                                Private & Fast.
                            </span>
                        </h1>

                        <p style={{
                            fontSize: "15px",
                            color: "rgba(255, 255, 255, 0.75)",
                            lineHeight: 1.6,
                            maxWidth: "460px",
                            margin: "0 0 20px 0"
                        }}>
                            Real-time encrypted messaging, peer-to-peer WebRTC video calling,
                            and intelligent AI copilot in one unified space.
                        </p>

                        {/* Star Rating Badge from Video */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#f59e0b", fontSize: "16px" }}>★ 4.9</span>
                            <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.75)" }}>
                                from 10,000+ active conversations
                            </span>
                        </div>
                    </div>

                    {/* Right: Floating Dark Glassmorphism Card (From Video) */}
                    <div style={{
                        width: "100%",
                        maxWidth: "380px",
                        background: "rgba(15, 23, 42, 0.75)",
                        backdropFilter: "blur(24px)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        borderRadius: "24px",
                        padding: "24px",
                        boxShadow: "0 24px 50px rgba(0, 0, 0, 0.45)",
                        color: "white"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                            <div>
                                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "white" }}>
                                    Pine Family Lounge
                                </h3>
                                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)" }}>
                                    Encrypted Active Room
                                </span>
                            </div>
                            <span style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: "#10b981",
                                boxShadow: "0 0 10px #10b981"
                            }} />
                        </div>

                        {/* Mode Selectors */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            marginBottom: "16px"
                        }}>
                            <div style={{
                                padding: "10px 12px",
                                borderRadius: "12px",
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.1)"
                            }}>
                                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>Protocol</div>
                                <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>Signal E2EE</div>
                            </div>
                            <div style={{
                                padding: "10px 12px",
                                borderRadius: "12px",
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.1)"
                            }}>
                                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>Calling</div>
                                <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px" }}>1080p WebRTC</div>
                            </div>
                        </div>

                        {/* Room Info */}
                        <div style={{
                            padding: "12px 14px",
                            borderRadius: "14px",
                            background: "rgba(0, 0, 0, 0.3)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            marginBottom: "20px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Delivery Latency</span>
                                <span style={{ fontWeight: 600, color: "#10b981" }}>&lt; 20ms WebSocket</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Status</span>
                                <span style={{ fontWeight: 600 }}>Ready to Connect</span>
                            </div>
                        </div>

                        {/* Reserve / Connect Button */}
                        <button
                            onClick={handleGetStarted}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "14px",
                                border: "none",
                                background: "white",
                                color: "#0f172a",
                                fontSize: "15px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "transform 0.15s ease",
                                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)"
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            {token ? "Launch Workspace →" : "Connect with Google / Email"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Lower Atmospheric Wrapper (Synchronized with Hero) ───────────── */}
            <div style={{
                position: "relative",
                zIndex: 10,
                background: "linear-gradient(180deg, rgba(13, 27, 42, 0.95) 0%, #0a111e 40%, #060b14 100%)",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                paddingTop: "60px",
                paddingBottom: "80px"
            }}>
                {/* Ambient Glow Orbs */}
                <div style={{
                    position: "absolute",
                    top: "10%",
                    right: "5%",
                    width: "480px",
                    height: "480px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: 0
                }} />
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "2%",
                    width: "520px",
                    height: "520px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: 0
                }} />

                {/* ── 1. Uncompromising Architecture Section (Synchronized Bento Grid) ── */}
                <section id="security" style={{
                    maxWidth: "1180px",
                    margin: "0 auto 80px",
                    padding: "0 28px",
                    boxSizing: "border-box",
                    position: "relative",
                    zIndex: 2
                }}>
                    <div style={{ textAlign: "center", marginBottom: "48px" }}>
                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 16px",
                            borderRadius: "20px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "1.2px",
                            textTransform: "uppercase",
                            color: "rgba(255, 255, 255, 0.8)",
                            marginBottom: "16px"
                        }}>
                            <span style={{ color: "#10b981" }}>●</span> System Specifications
                        </div>
                        <h2 style={{
                            fontSize: "clamp(30px, 4.5vw, 48px)",
                            fontWeight: 800,
                            letterSpacing: "-1px",
                            color: "white",
                            margin: "0 0 14px 0"
                        }}>
                            Uncompromising Architecture
                        </h2>
                        <p style={{
                            color: "rgba(255, 255, 255, 0.65)",
                            fontSize: "15px",
                            maxWidth: "640px",
                            margin: "0 auto",
                            lineHeight: 1.6
                        }}>
                            Engineered from the ground up with zero-knowledge cryptography, peer-to-peer WebRTC media streams, and contextual AI acceleration.
                        </p>
                    </div>

                    {/* Synchronized Bento Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                        gap: "22px"
                    }}>
                        {/* Bento Card 1: Signal Protocol E2EE */}
                        <div style={{
                            gridColumn: "span 1",
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(16, 185, 129, 0.12)",
                                        border: "1px solid rgba(16, 185, 129, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        🛡️
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#10b981",
                                        background: "rgba(16, 185, 129, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(16, 185, 129, 0.25)"
                                    }}>
                                        Double Ratchet E2EE
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    Signal Protocol Security
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    Continuous key derivation ensures zero server-side plaintext exposure. Curve25519 identity keys and quantum-resistant Kyber pre-keys stay strictly on your device.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Verification</span>
                                <span style={{ color: "#10b981", fontWeight: 600 }}>● Peer-to-Peer Verified</span>
                            </div>
                        </div>

                        {/* Bento Card 2: WebRTC 1080p Calling */}
                        <div style={{
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(56, 189, 248, 0.12)",
                                        border: "1px solid rgba(56, 189, 248, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        📹
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#38bdf8",
                                        background: "rgba(56, 189, 248, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(56, 189, 248, 0.25)"
                                    }}>
                                        DTLS-SRTP P2P
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    1080p WebRTC Conference
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    Direct peer-to-peer audio and video mesh with native screen sharing, camera flipping, and multi-user group conference support.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Jitter Latency</span>
                                <span style={{ color: "#38bdf8", fontWeight: 600 }}>&lt; 20ms Ultra-Low</span>
                            </div>
                        </div>

                        {/* Bento Card 3: Groq LLaMA & RAG */}
                        <div style={{
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(245, 158, 11, 0.12)",
                                        border: "1px solid rgba(245, 158, 11, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        🤖
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#f59e0b",
                                        background: "rgba(245, 158, 11, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(245, 158, 11, 0.25)"
                                    }}>
                                        500+ Tokens/Sec
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    Groq LLaMA & Contextual RAG
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    Instant AI copilot integrated into chats. Query uploaded documents, extract action items, search semantics, and synthesize custom diffusion imagery.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Engine</span>
                                <span style={{ color: "#f59e0b", fontWeight: 600 }}>Groq LPU Acceleration</span>
                            </div>
                        </div>

                        {/* Bento Card 4: Real-Time Live Location */}
                        <div style={{
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(168, 85, 247, 0.12)",
                                        border: "1px solid rgba(168, 85, 247, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        📍
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#c084fc",
                                        background: "rgba(168, 85, 247, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(168, 85, 247, 0.25)"
                                    }}>
                                        Leaflet Maps
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    Live Location Telemetry
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    Interactive open-source map integration with real-time tracking broadcasts, custom auto-expiration windows (15m, 1h, 8h), and static GPS pin dropping.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Privacy</span>
                                <span style={{ color: "#c084fc", fontWeight: 600 }}>Ephemeral Broadcast</span>
                            </div>
                        </div>

                        {/* Bento Card 5: Voice Notes & Waveforms */}
                        <div style={{
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(244, 63, 94, 0.12)",
                                        border: "1px solid rgba(244, 63, 94, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        🎙️
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#fb7185",
                                        background: "rgba(244, 63, 94, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(244, 63, 94, 0.25)"
                                    }}>
                                        Opus Audio Codec
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    Voice Notes & Rich Media
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    High-fidelity voice memo recording with live pause/resume, multi-attachment upload queuing, and interactive message reactions.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Fidelity</span>
                                <span style={{ color: "#fb7185", fontWeight: 600 }}>Uncompressed Stereo</span>
                            </div>
                        </div>

                        {/* Bento Card 6: Encrypted Backups Vault */}
                        <div style={{
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(24px)",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            borderRadius: "24px",
                            padding: "32px",
                            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.35)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            transition: "transform 0.2s ease, border-color 0.2s ease"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)"; }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "14px",
                                        background: "rgba(20, 184, 166, 0.12)",
                                        border: "1px solid rgba(20, 184, 166, 0.3)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "20px"
                                    }}>
                                        💾
                                    </div>
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        color: "#2dd4bf",
                                        background: "rgba(20, 184, 166, 0.1)",
                                        padding: "4px 10px",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(20, 184, 166, 0.25)"
                                    }}>
                                        AES-256 Vault
                                    </span>
                                </div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 10px 0" }}>
                                    Client-Side Encrypted Backups
                                </h3>
                                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 20px 0" }}>
                                    Export portable encrypted snapshots with media bundles and restore conversation histories seamlessly across any desktop session.
                                </p>
                            </div>
                            <div style={{
                                padding: "12px 14px",
                                borderRadius: "12px",
                                background: "rgba(0, 0, 0, 0.25)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px"
                            }}>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>Portability</span>
                                <span style={{ color: "#2dd4bf", fontWeight: 600 }}>Zero Cloud Lock-in</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 2. Interactive Feature Demo Sandbox (Synchronized Glass Card) ──── */}
                <section id="features" style={{
                    maxWidth: "1180px",
                    margin: "0 auto 80px",
                    padding: "0 28px",
                    boxSizing: "border-box",
                    position: "relative",
                    zIndex: 2
                }}>
                    <div style={{ textAlign: "center", marginBottom: "40px" }}>
                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 16px",
                            borderRadius: "20px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "1.2px",
                            textTransform: "uppercase",
                            color: "rgba(255, 255, 255, 0.8)",
                            marginBottom: "16px"
                        }}>
                            ✦ Real-Time Capabilities Sandbox
                        </div>
                        <h2 style={{
                            fontSize: "clamp(28px, 4vw, 44px)",
                            fontWeight: 800,
                            letterSpacing: "-1px",
                            color: "white",
                            margin: "0 0 12px 0"
                        }}>
                            Test Interactive Capabilities
                        </h2>
                        <p style={{
                            color: "rgba(255, 255, 255, 0.65)",
                            fontSize: "15px",
                            maxWidth: "600px",
                            margin: "0 auto 28px",
                            lineHeight: 1.6
                        }}>
                            Switch between tabs to test live reactions, Groq AI responses, WebRTC media controls, and cryptographic Signal keys.
                        </p>

                        {/* Synchronized Pill Tab Selector */}
                        <div style={{
                            display: "inline-flex",
                            background: "rgba(15, 23, 42, 0.7)",
                            backdropFilter: "blur(20px)",
                            padding: "6px",
                            borderRadius: "18px",
                            border: "1px solid rgba(255, 255, 255, 0.14)",
                            gap: "6px",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
                        }}>
                            {[
                                { id: 'chat', label: '💬 Real-Time Chat' },
                                { id: 'ai', label: '🤖 AI Assistant & RAG' },
                                { id: 'call', label: '📹 WebRTC HD Calling' },
                                { id: 'e2ee', label: '🛡️ Signal Ratchet' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "14px",
                                        border: "none",
                                        background: activeTab === t.id ? "white" : "transparent",
                                        color: activeTab === t.id ? "#0f172a" : "rgba(255, 255, 255, 0.75)",
                                        fontWeight: 700,
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interactive Frame Container */}
                    <div style={{
                        background: "rgba(15, 23, 42, 0.7)",
                        backdropFilter: "blur(28px)",
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        borderRadius: "28px",
                        boxShadow: "0 28px 70px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                        overflow: "hidden"
                    }}>
                        {/* Synchronized Card Header */}
                        <div style={{
                            padding: "18px 24px",
                            background: "rgba(255, 255, 255, 0.03)",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: "#10b981",
                                    boxShadow: "0 0 10px #10b981"
                                }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>
                                    {activeTab === 'chat' && "Pine Family Lounge • Direct & Group Messaging"}
                                    {activeTab === 'ai' && "Groq LLaMA Inference & Contextual Document RAG"}
                                    {activeTab === 'call' && "WebRTC 1080p Peer-to-Peer Session"}
                                    {activeTab === 'e2ee' && "Double Ratchet Ephemeral Cryptographic Handshake"}
                                </span>
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#10b981", textTransform: "uppercase" }}>
                                ● 100% Ready (Socket.IO)
                            </span>
                        </div>

                        {/* Tab 1: Chat Sandbox */}
                        {activeTab === 'chat' && (
                            <div style={{ padding: "32px", minHeight: "380px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                                        <div style={{
                                            width: "42px",
                                            height: "42px",
                                            borderRadius: "14px",
                                            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            color: "white"
                                        }}>
                                            A
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>
                                                Alice • Verified E2EE Session
                                            </div>
                                            <div style={{
                                                background: "rgba(255, 255, 255, 0.08)",
                                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                                padding: "14px 20px",
                                                borderRadius: "18px 18px 18px 4px",
                                                maxWidth: "460px",
                                                fontSize: "14px",
                                                lineHeight: 1.6,
                                                color: "white"
                                            }}>
                                                Hey team! The latest encrypted backup is synchronized in the vault and the HD WebRTC calling room is online.
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "14px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>
                                                You • Double Ratchet Ciphertext
                                            </div>
                                            <div style={{
                                                background: "white",
                                                color: "#0f172a",
                                                padding: "14px 20px",
                                                borderRadius: "18px 18px 4px 18px",
                                                maxWidth: "460px",
                                                fontSize: "14px",
                                                lineHeight: 1.6,
                                                fontWeight: 500,
                                                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)"
                                            }}>
                                                Testing live reactions right now! Click any emoji below to test live interactive reactions 👇
                                            </div>

                                            {/* Clickable Reactions */}
                                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                                <button
                                                    onClick={() => handleReaction('heart')}
                                                    style={{
                                                        background: userReacted === 'heart' ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.08)",
                                                        border: userReacted === 'heart' ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.15)",
                                                        padding: "6px 12px",
                                                        borderRadius: "14px",
                                                        fontSize: "13px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}>
                                                    ❤️ {reactionCount.heart}
                                                </button>
                                                <button
                                                    onClick={() => handleReaction('fire')}
                                                    style={{
                                                        background: userReacted === 'fire' ? "rgba(249, 115, 22, 0.3)" : "rgba(255, 255, 255, 0.08)",
                                                        border: userReacted === 'fire' ? "1px solid #f97316" : "1px solid rgba(255, 255, 255, 0.15)",
                                                        padding: "6px 12px",
                                                        borderRadius: "14px",
                                                        fontSize: "13px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}>
                                                    🔥 {reactionCount.fire}
                                                </button>
                                                <button
                                                    onClick={() => handleReaction('thumbs')}
                                                    style={{
                                                        background: userReacted === 'thumbs' ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)",
                                                        border: userReacted === 'thumbs' ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.15)",
                                                        padding: "6px 12px",
                                                        borderRadius: "14px",
                                                        fontSize: "13px",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}>
                                                    👍 {reactionCount.thumbs}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{
                                            width: "42px",
                                            height: "42px",
                                            borderRadius: "14px",
                                            background: "linear-gradient(135deg, #a855f7, #6366f1)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            color: "white"
                                        }}>
                                            Y
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: "28px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "14px 20px",
                                    background: "rgba(0, 0, 0, 0.3)",
                                    borderRadius: "18px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}>
                                    <span style={{ color: "#10b981", fontSize: "13px", fontWeight: 600 }}>🔒 Signal E2EE</span>
                                    <input
                                        readOnly
                                        value="Type a message in Pine Family Lounge..."
                                        style={{ flex: 1, background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.5)", outline: "none", fontSize: "14px" }}
                                    />
                                    <button
                                        onClick={handleGetStarted}
                                        style={{
                                            background: "white",
                                            border: "none",
                                            color: "#0f172a",
                                            padding: "10px 22px",
                                            borderRadius: "12px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
                                        }}>
                                        Open Chat →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: AI Assistant Sandbox */}
                        {activeTab === 'ai' && (
                            <div style={{ padding: "32px", minHeight: "380px" }}>
                                <div style={{ marginBottom: "24px" }}>
                                    <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "12px" }}>
                                        Select an intelligent prompt to test Groq LLaMA copilot:
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                        {aiPrompts.map((p, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setAiQueryIndex(idx)}
                                                style={{
                                                    padding: "10px 18px",
                                                    borderRadius: "14px",
                                                    border: aiQueryIndex === idx ? "1px solid rgba(255, 255, 255, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
                                                    background: aiQueryIndex === idx ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.05)",
                                                    color: aiQueryIndex === idx ? "white" : "rgba(255, 255, 255, 0.7)",
                                                    fontSize: "13px",
                                                    fontWeight: 500,
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease"
                                                }}>
                                                "{p.query.slice(0, 42)}..."
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{
                                    background: "rgba(0, 0, 0, 0.35)",
                                    borderRadius: "18px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    padding: "24px"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                                        <span style={{ fontSize: "18px" }}>🤖</span>
                                        <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: "14px" }}>
                                            Groq LLaMA • Contextual RAG Copilot
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: "14px",
                                        color: "rgba(255, 255, 255, 0.9)",
                                        lineHeight: 1.7,
                                        whiteSpace: "pre-wrap",
                                        fontFamily: "monospace"
                                    }}>
                                        {aiPrompts[aiQueryIndex].response}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: WebRTC Call Sandbox */}
                        {activeTab === 'call' && (
                            <div style={{ padding: "32px", minHeight: "380px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
                                <div style={{
                                    width: "100%",
                                    maxWidth: "560px",
                                    height: "240px",
                                    background: cameraActive ? "rgba(30, 41, 59, 0.85)" : "#0b0f19",
                                    borderRadius: "22px",
                                    border: "1px solid rgba(255, 255, 255, 0.16)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)"
                                }}>
                                    <div style={{
                                        width: "76px",
                                        height: "76px",
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "32px",
                                        boxShadow: "0 8px 24px rgba(59, 130, 246, 0.3)"
                                    }}>
                                        👤
                                    </div>
                                    <div style={{ marginTop: "14px", fontWeight: 700, fontSize: "16px", color: "white" }}>
                                        Pine Family Lounge • WebRTC Room
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#10b981", marginTop: "4px" }}>
                                        ● 1080p HD • Latency: 18ms • DTLS-SRTP Mesh
                                    </div>
                                    <div style={{ position: "absolute", top: "14px", right: "14px", fontSize: "11px", background: "rgba(0,0,0,0.6)", padding: "5px 10px", borderRadius: "10px", color: "white" }}>
                                        {callMuted ? "🔇 Muted" : "🎙️ Mic Active"}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                                    <button
                                        onClick={() => setCallMuted(prev => !prev)}
                                        style={{
                                            padding: "11px 20px",
                                            borderRadius: "14px",
                                            border: "none",
                                            background: callMuted ? "#ef4444" : "rgba(255, 255, 255, 0.12)",
                                            color: "white",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: 600
                                        }}>
                                        {callMuted ? "Unmute Mic" : "Mute Mic"}
                                    </button>
                                    <button
                                        onClick={() => setCameraActive(prev => !prev)}
                                        style={{
                                            padding: "11px 20px",
                                            borderRadius: "14px",
                                            border: "none",
                                            background: cameraActive ? "rgba(255, 255, 255, 0.12)" : "#ef4444",
                                            color: "white",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: 600
                                        }}>
                                        {cameraActive ? "Camera Off" : "Camera On"}
                                    </button>
                                    <button
                                        onClick={handleGetStarted}
                                        style={{
                                            padding: "11px 24px",
                                            borderRadius: "14px",
                                            border: "none",
                                            background: "white",
                                            color: "#0f172a",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.2)"
                                        }}>
                                        Launch Full Call →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab 4: E2EE Cryptographic Details */}
                        {activeTab === 'e2ee' && (
                            <div style={{ padding: "32px", minHeight: "380px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "24px", borderRadius: "18px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        <div style={{ color: "#10b981", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                                            ✓ Curve25519 Identity Keys
                                        </div>
                                        <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6 }}>
                                            Generated directly inside the browser / desktop client. Private keys never touch any intermediary server.
                                        </div>
                                    </div>
                                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "24px", borderRadius: "18px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                                            ✓ Post-Quantum Kyber Pre-Keys
                                        </div>
                                        <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6 }}>
                                            Quantum-resistant key encapsulation ready to safeguard communications against future quantum decryption.
                                        </div>
                                    </div>
                                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "24px", borderRadius: "18px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                        <div style={{ color: "#c084fc", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                                            ✓ Double Ratchet Key Derivation
                                        </div>
                                        <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6 }}>
                                            Generates a new ephemeral symmetric key for every single message sent, providing perfect forward secrecy.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── 3. Synchronized Conversion CTA Banner ──────────────────────────── */}
                <section style={{
                    maxWidth: "1080px",
                    margin: "0 auto",
                    padding: "0 28px",
                    boxSizing: "border-box",
                    position: "relative",
                    zIndex: 2
                }}>
                    <div style={{
                        padding: "54px 36px",
                        borderRadius: "28px",
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.18)",
                        backdropFilter: "blur(28px)",
                        textAlign: "center",
                        boxShadow: "0 28px 70px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                    }}>
                        <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "white", marginBottom: "14px", letterSpacing: "-0.5px" }}>
                            Ready to Experience Next-Gen Chat?
                        </h2>
                        <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "16px", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.6 }}>
                            Connect now using one-click Google Authentication or email to enter your encrypted workspace.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
                            <button
                                onClick={handleGetStarted}
                                style={{
                                    padding: "15px 36px",
                                    borderRadius: "16px",
                                    border: "none",
                                    background: "white",
                                    color: "#0f172a",
                                    fontWeight: 700,
                                    fontSize: "15px",
                                    cursor: "pointer",
                                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.3)",
                                    transition: "transform 0.15s ease"
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                                {token ? "Open Workspace →" : "Sign In with Google / Email"}
                            </button>
                            {!token && (
                                <button
                                    onClick={handleSignUp}
                                    style={{
                                        padding: "15px 30px",
                                        borderRadius: "16px",
                                        border: "1px solid rgba(255, 255, 255, 0.25)",
                                        background: "rgba(255, 255, 255, 0.08)",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "15px",
                                        cursor: "pointer",
                                        transition: "background 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}>
                                    Create Free Account
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Synchronized Footer ─────────────────────────────────────────────── */}
            <footer style={{
                background: "#060b14",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "32px 28px",
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "13px",
                position: "relative",
                zIndex: 10
            }}>
                <div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>© {new Date().getFullYear()} Project2 Chat Platform. High-Performance Encrypted Messaging.</div>
                    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                        <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                            Socket.io Active
                        </span>
                        <span>WebRTC 1080p Ready</span>
                        <span>Groq AI Online</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
