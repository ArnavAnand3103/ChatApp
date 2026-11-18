import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPasswordRequest, loginRequest, resetPasswordRequest } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError("");

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const data = await loginRequest(email, password);

            if (data.message === "Invalid credentials") {
                setError("Invalid email or password");
                return;
            }

            if (data.message && data.message.includes("locked")) {
                setError("Account locked due to too many failed attempts. Please try again later.");
                return;
            }

            if (!data.user || !data.user.email) {
                setError(data.message || "Login failed: user data missing");
                return;
            }

            login(data.user, data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigate("/chat");
        } catch (err) {
            setError("Server connection error. Please make sure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const emailInput = email.trim() || prompt("Enter your registered account email:");
        if (!emailInput) return;

        try {
            const forgotData = await forgotPasswordRequest(emailInput);
            if (!forgotData.token) {
                alert(forgotData.message || "Could not generate reset token");
                return;
            }

            const token = prompt("Reset token generated. Paste token here to continue:", forgotData.token);
            if (!token) return;

            const newPassword = prompt("Enter new password (8+ characters):");
            if (!newPassword || newPassword.length < 8) {
                alert("Password must be at least 8 characters");
                return;
            }

            const confirmPassword = prompt("Confirm new password:");
            if (newPassword !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            const resetData = await resetPasswordRequest(token, newPassword);
            alert(resetData.message || "Password reset complete. You can now log in.");
        } catch (err) {
            alert(`Reset failed: ${err.message}`);
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
                    {/* Left Column: WhatsApp Instructions */}
                    <div style={{
                        flex: 1.1,
                        padding: "48px 40px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        borderRight: "1px solid rgba(134,150,160,0.15)"
                    }}>
                        <h2 style={{
                            fontSize: "26px",
                            fontWeight: "300",
                            color: "#e9edef",
                            marginBottom: "24px"
                        }}>
                            Log in to WhatsApp Web
                        </h2>

                        <ol style={{
                            paddingLeft: "20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                            color: "#aebac1",
                            fontSize: "15px",
                            lineHeight: "1.5"
                        }}>
                            <li>Enter your registered email address</li>
                            <li>Type your secure password (8+ characters)</li>
                            <li>Click <strong style={{ color: "#00a884" }}>Log In</strong> to access your conversations</li>
                        </ol>

                        <div style={{
                            marginTop: "32px",
                            padding: "16px",
                            background: "#111b21",
                            borderRadius: "12px",
                            border: "1px solid rgba(134,150,160,0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: "14px"
                        }}>
                            <div style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                background: "rgba(0,168,132,0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#00a884",
                                fontSize: "20px",
                                flexShrink: 0
                            }}>
                                🛡️
                            </div>
                            <div style={{ fontSize: "13px", color: "#8696a0", lineHeight: "1.4" }}>
                                Your personal messages and calls are secured with end-to-end encryption.
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Login Form */}
                    <div style={{
                        flex: 1,
                        background: "#111b21",
                        padding: "48px 36px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center"
                    }}>
                        <h3 style={{
                            fontSize: "20px",
                            fontWeight: "500",
                            color: "#e9edef",
                            marginBottom: "20px"
                        }}>
                            Enter Credentials
                        </h3>

                        {error && (
                            <div style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                color: "#f87171",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "16px",
                                lineHeight: "1.4"
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "6px" }}>
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
                                        padding: "12px 14px",
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
                                <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "6px" }}>
                                    PASSWORD
                                </label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
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
                                            fontSize: "16px"
                                        }}
                                    >
                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                                <span style={{ fontSize: "12px", color: "#8696a0", marginTop: "4px", display: "block" }}>
                                    Must be at least 8 characters
                                </span>
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
                                    marginTop: "8px",
                                    boxShadow: "0 2px 8px rgba(0,168,132,0.3)",
                                    transition: "all 0.2s"
                                }}
                            >
                                {loading ? "Logging in..." : "Log In"}
                            </button>

                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: "12px",
                                fontSize: "13px"
                            }}>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#00a884",
                                        cursor: "pointer",
                                        padding: 0,
                                        fontSize: "13px"
                                    }}
                                >
                                    Forgot password?
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/signup")}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#00a884",
                                        cursor: "pointer",
                                        padding: 0,
                                        fontSize: "13px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Sign up →
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
