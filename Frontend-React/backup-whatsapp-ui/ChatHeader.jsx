import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';

export default function ChatHeader({
    selectedUser,
    statusText,
    isTyping,
    onToggleBlock,
    onDeleteHistory,
    onLogout,
    onToggleTheme,
    onPhoto,
    onAnalytics,
    onToggleSearch,
    isBlocked,
    myPhoto,
    onShowGroupInfo,
    onPhotoClick,
    onShowContactInfo,
    onOpenProfile,
    onAudioCall,
    onVideoCall
}) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { groupCallActiveStatusMap, setActiveGroupCall, setCallStatus } = useCall();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleStartGroupCall = (callType) => {
        setActiveGroupCall({
            groupId: selectedUser?._id,
            groupName: selectedUser?.name,
            callType
        });
        setCallStatus("connected");
    };

    const handleJoinGroupCall = () => {
        const activeCall = groupCallActiveStatusMap?.[selectedUser?._id];
        if (!activeCall) return;
        setActiveGroupCall({
            groupId: selectedUser?._id,
            groupName: selectedUser?.name,
            callType: "video"
        });
        setCallStatus("connected");
    };

    const initials = String(selectedUser?.name || "?").slice(0, 2).toUpperCase();

    const isOnline = statusText === "Active now" || statusText === "online";

    return (
        <div className="chat-header">
            {/* Contact / User Info */}
            <div className="header-user">
                <div
                    className="avatar"
                    onClick={onPhotoClick}
                    style={{
                        cursor: selectedUser?.photo ? "pointer" : "default",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: selectedUser?.isGroup ? "#00a884" : "#536471"
                    }}
                    title={selectedUser?.photo ? "Click to view full photo" : ""}
                >
                    {selectedUser?.photo ? (
                        <img
                            src={selectedUser.photo}
                            alt={selectedUser.name}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "50%"
                            }}
                        />
                    ) : selectedUser?.isGroup ? (
                        "👥"
                    ) : (
                        initials
                    )}
                </div>

                <div
                    className="header-info"
                    onClick={selectedUser?.isGroup ? onShowGroupInfo : (selectedUser?.email !== "ai@chatapp.com" ? onShowContactInfo : undefined)}
                    style={{
                        cursor: selectedUser?.email !== "ai@chatapp.com" ? "pointer" : "default",
                        marginLeft: "14px"
                    }}
                    title={selectedUser?.isGroup ? "View group info" : (selectedUser?.email !== "ai@chatapp.com" ? "View contact info" : "")}
                >
                    <div className="header-name" style={{ fontSize: "16px", fontWeight: "500", color: "#e9edef" }}>
                        {selectedUser?.name || "Select User"}
                    </div>

                    <div
                        id="headerStatus"
                        style={{
                            fontSize: "12px",
                            color: isOnline ? "#00a884" : "#8696a0",
                            marginTop: "2px",
                            fontWeight: isOnline ? "600" : "400"
                        }}
                    >
                        {selectedUser?.email === "ai@chatapp.com"
                            ? "AI Assistant • Powered by Groq"
                            : statusText}
                    </div>

                    {isTyping && (
                        <div className="typing-indicator active">
                            <div className="dot-container">
                                <div className="dot" />
                                <div className="dot" />
                                <div className="dot" />
                            </div>
                            <span>typing...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Header Action Buttons (WhatsApp Style) */}
            <div className="header-actions" style={{ position: "relative" }} ref={menuRef}>
                {/* Group Calling */}
                {selectedUser?.isGroup && (
                    <>
                        {groupCallActiveStatusMap?.[selectedUser?._id]?.isActive ? (
                            <button
                                onClick={handleJoinGroupCall}
                                style={{
                                    background: "#00a884",
                                    color: "#111b21",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    border: "none",
                                    cursor: "pointer",
                                    width: "auto"
                                }}
                            >
                                📞 Join Call ({groupCallActiveStatusMap[selectedUser._id].participantCount})
                            </button>
                        ) : (
                            <>
                                <button onClick={() => handleStartGroupCall("audio")} title="Start Group Audio Call">
                                    📞
                                </button>
                                <button onClick={() => handleStartGroupCall("video")} title="Start Group Video Call">
                                    📹
                                </button>
                            </>
                        )}
                        <button onClick={onShowGroupInfo} title="Group Info">
                            ℹ️
                        </button>
                    </>
                )}

                {/* 1-on-1 Calling & Info */}
                {!selectedUser?.isGroup && selectedUser?.email !== "ai@chatapp.com" && (
                    <>
                        <button onClick={onAudioCall} title="Audio Call">
                            📞
                        </button>
                        <button onClick={onVideoCall} title="Video Call">
                            📹
                        </button>
                        <button onClick={onShowContactInfo} title="Contact Info">
                            ℹ️
                        </button>
                    </>
                )}

                {/* Search in chat */}
                <button onClick={onToggleSearch} title="Search in chat">
                    🔍
                </button>

                {/* WhatsApp Style Overflow Menu (⋮) */}
                <button 
                    onClick={() => setMenuOpen(!menuOpen)} 
                    title="Menu"
                    style={{ fontSize: "18px", fontWeight: "bold" }}
                >
                    ⋮
                </button>

                {menuOpen && (
                    <div style={{
                        position: "absolute",
                        top: "48px",
                        right: "0px",
                        background: "#202c33",
                        borderRadius: "8px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        border: "1px solid rgba(134,150,160,0.15)",
                        minWidth: "190px",
                        zIndex: 100,
                        padding: "6px 0",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        <div
                            onClick={() => { onOpenProfile(); setMenuOpen(false); }}
                            style={menuItemStyle}
                        >
                            <span>👤</span>
                            <span>My Profile</span>
                        </div>

                        {selectedUser?.isGroup ? (
                            <div
                                onClick={() => { onShowGroupInfo(); setMenuOpen(false); }}
                                style={menuItemStyle}
                            >
                                <span>ℹ️</span>
                                <span>Group Info</span>
                            </div>
                        ) : selectedUser?.email !== "ai@chatapp.com" ? (
                            <div
                                onClick={() => { onShowContactInfo(); setMenuOpen(false); }}
                                style={menuItemStyle}
                            >
                                <span>ℹ️</span>
                                <span>Contact Info</span>
                            </div>
                        ) : null}

                        <div
                            onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                            style={menuItemStyle}
                        >
                            <span>🌓</span>
                            <span>Toggle Theme</span>
                        </div>

                        <div
                            onClick={() => { navigate("/starred"); setMenuOpen(false); }}
                            style={menuItemStyle}
                        >
                            <span>⭐</span>
                            <span>Starred Messages</span>
                        </div>

                        <div
                            onClick={() => { onAnalytics(); setMenuOpen(false); }}
                            style={menuItemStyle}
                        >
                            <span>📊</span>
                            <span>Analytics</span>
                        </div>

                        {!selectedUser?.isGroup && selectedUser?.email !== "ai@chatapp.com" && (
                            <div
                                onClick={() => { onToggleBlock(); setMenuOpen(false); }}
                                style={{
                                    ...menuItemStyle,
                                    color: isBlocked ? "#00a884" : "#f87171"
                                }}
                            >
                                <span>{isBlocked ? "🔓" : "🚫"}</span>
                                <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                            </div>
                        )}

                        <div
                            onClick={() => { onDeleteHistory(); setMenuOpen(false); }}
                            style={{ ...menuItemStyle, color: "#f87171" }}
                        >
                            <span>🗑️</span>
                            <span>Delete Chat History</span>
                        </div>

                        <div
                            style={{
                                height: "1px",
                                background: "rgba(134,150,160,0.15)",
                                margin: "4px 0"
                            }}
                        />

                        <div
                            onClick={() => { onLogout(); setMenuOpen(false); }}
                            style={{ ...menuItemStyle, color: "#f87171" }}
                        >
                            <span>🚪</span>
                            <span>Log Out</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const menuItemStyle = {
    padding: "10px 18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#e9edef",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background 0.15s ease",
    whiteSpace: "nowrap"
};
