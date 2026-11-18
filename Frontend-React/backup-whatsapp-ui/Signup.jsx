import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupRequest } from '../services/api';

export default function Signup() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async (e) => {
        if (e) e.preventDefault();
        setError("");

        const safeName = name.trim();
        const safeEmail = email.trim();

        if (!safeName || !safeEmail || !password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (safeName.length < 2) {
            setError("Name must be at least 2 characters");
            return;
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(safeEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const data = await signupRequest(safeName, safeEmail, password);
            if (data.message === "Signup successful") {
                alert("Account created successfully! Please log in.");
                navigate("/login");
            } else {
                setError(data.message || "Signup failed");
            }
        } catch (err) {
            setError("Server error. Please ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

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
                <div 
                    onClick={() => navigate("/")}
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                >
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
                    {/* Left Column: WhatsApp Benefits */}
                    <div style={{
                        flex: 1,
                        padding: "48px 40px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        borderRight: "1px solid rgba(134,150,160,0.15)"
                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "rgba(0,168,132,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "26px",
                            marginBottom: "20px"
                        }}>
                            ✨
                        </div>

                        <h2 style={{
                            fontSize: "26px",
                            fontWeight: "300",
                            color: "#e9edef",
                            marginBottom: "16px"
                        }}>
                            Join WhatsApp Web
                        </h2>

                        <p style={{
                            fontSize: "14px",
                            color: "#8696a0",
                            lineHeight: "1.6",
                            marginBottom: "24px"
                        }}>
                            Create your account to start instant conversations, join groups, make high-definition audio & video calls, and interact with the AI assistant.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#aebac1", fontSize: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: "#00a884" }}>✓</span>
                                <span>No subscription required • Always free</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: "#00a884" }}>✓</span>
                                <span>End-to-end encrypted communications</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: "#00a884" }}>✓</span>
                                <span>Share photos, voice notes, files & location</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Signup Form */}
                    <div style={{
                        flex: 1.1,
                        background: "#111b21",
                        padding: "44px 36px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}>
                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: "500",
                            color: "#e9edef",
                            marginBottom: "16px"
                        }}>
                            Create Account
                        </h3>

                        {error && (
                            <div style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                color: "#f87171",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "14px",
                                lineHeight: "1.4"
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "4px" }}>
                                    FULL NAME
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Alex Johnson"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(134,150,160,0.25)",
                                        background: "#202c33",
                                        color: "#e9edef",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "4px" }}>
                                    EMAIL ADDRESS
                                </label>
                                <input
                                    type="email"
                                    placeholder="e.g. name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(134,150,160,0.25)",
                                        background: "#202c33",
                                        color: "#e9edef",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "4px" }}>
                                    PASSWORD
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="At least 8 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            paddingRight: "40px",
                                            borderRadius: "8px",
                                            border: "1px solid rgba(134,150,160,0.25)",
                                            background: "#202c33",
                                            color: "#e9edef",
                                            fontSize: "14px",
                                            outline: "none"
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "10px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            color: "#8696a0",
                                            cursor: "pointer",
                                            fontSize: "15px"
                                        }}
                                    >
                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "4px" }}>
                                    CONFIRM PASSWORD
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid rgba(134,150,160,0.25)",
                                        background: "#202c33",
                                        color: "#e9edef",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    borderRadius: "24px",
                                    border: "none",
                                    background: "#00a884",
                                    color: "#111b21",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    marginTop: "6px",
                                    boxShadow: "0 2px 8px rgba(0,168,132,0.3)"
                                }}
                            >
                                {loading ? "Creating Account..." : "Agree & Continue"}
                            </button>

                            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "13px", color: "#8696a0" }}>
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#00a884",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        fontSize: "13px"
                                    }}
                                >
                                    Log in
                                </button>
                            </div>
                        </form>
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
