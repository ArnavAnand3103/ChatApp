import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import ProfileAvatar from './ProfileAvatar';

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
    onAudioCall,
    onVideoCall,
    onCallHistory,
    onBackupRestore,
    onOpenAI,
    onContactInfo,
    onRemovePhoto,
    onBack
}) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { groupCallActiveStatusMap, setActiveGroupCall, setCallStatus } = useCall();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
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

    return (
        <div className="chat-header">
            {/* Left: User Profile & Status */}
            <div className="header-user">
                {onBack && (
                    <button
                        type="button"
                        className="chat-back-btn"
                        onClick={onBack}
                        title="Back to chat list"
                        aria-label="Back to chat list"
                    >
                        ←
                    </button>
                )}
                <div
                    onClick={onPhoto}
                    role="button"
                    tabIndex={selectedUser ? 0 : -1}
                    onKeyDown={(event) => {
                        if (selectedUser && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            onPhoto?.();
                        }
                    }}
                    title={selectedUser ? "Change your profile photo" : ""}
                    style={{ cursor: selectedUser ? "pointer" : "default" }}
                >
                    <ProfileAvatar name={selectedUser?.name} photo={selectedUser?.photo} size={46} className="avatar" />
                </div>
                <div className="header-info">
                    <div className="header-name">{selectedUser?.name || "Select User"}</div>
                    <div id="headerStatus" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", fontWeight: 500 }}>
                        {statusText}
                    </div>
                    {isTyping && (
                        <div className="typing-indicator active">
                            <div className="dot-container">
                                <div className="dot"></div>
                                <div className="dot"></div>
                                <div className="dot"></div>
                            </div>
                            <span>typing...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Modern Compact Action Bar */}
            <div className="header-actions">
                {/* 1. AI Assistant Pill */}
                <button
                    className="ai-assistant-btn"
                    onClick={onOpenAI}
                    title="Open AI Assistant (AI Chat, Image Gen, Document RAG & Semantic Search)"
                >
                    <span className="ai-icon">✨</span>
                    <span className="ai-label">AI Copilot</span>
                </button>

                {/* 2. Group Calling */}
                {selectedUser?.isGroup && (
                    <>
                        {groupCallActiveStatusMap?.[selectedUser?._id]?.isActive ? (
                            <button
                                onClick={handleJoinGroupCall}
                                style={{
                                    background: "#10b981",
                                    color: "white",
                                    padding: "7px 14px",
                                    borderRadius: "14px",
                                    fontWeight: "600",
                                    fontSize: "13px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    border: "none",
                                    cursor: "pointer"
                                }}
                            >
                                📞 Join Call ({groupCallActiveStatusMap[selectedUser._id].participantCount})
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleStartGroupCall("audio")}
                                    title="Start Group Audio Call"
                                    className="header-icon-btn"
                                >
                                    📞
                                </button>
                                <button
                                    onClick={() => handleStartGroupCall("video")}
                                    title="Start Group Video Call"
                                    className="header-icon-btn"
                                >
                                    📹
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* 3. Direct Calling (1-on-1) */}
                {!selectedUser?.isGroup && selectedUser?.email !== "ai@chatapp.com" && (
                    <>
                        <button
                            onClick={onAudioCall}
                            title="Audio Call"
                            className="header-icon-btn"
                        >
                            📞
                        </button>
                        <button
                            onClick={onVideoCall}
                            title="Video Call"
                            className="header-icon-btn"
                        >
                            📹
                        </button>
                    </>
                )}

                {/* 4. Search in Chat */}
                <button
                    onClick={onToggleSearch}
                    title="Search Messages"
                    className="header-icon-btn"
                >
                    🔍
                </button>

                {/* 5. More Options Dropdown Menu (Consolidating secondary tools) */}
                <div style={{ position: "relative" }} ref={dropdownRef}>
                    <button
                        className="header-icon-btn"
                        onClick={() => setDropdownOpen(prev => !prev)}
                        title="More Options"
                        style={{ fontSize: "16px", fontWeight: "bold" }}
                    >
                        ⋮
                    </button>

                    {dropdownOpen && (
                        <div className="header-dropdown-menu">
                            {selectedUser?.isGroup ? (
                                <button onClick={() => { onShowGroupInfo(); setDropdownOpen(false); }}>
                                    ℹ️ Group Info
                                </button>
                            ) : (
                                <button onClick={() => { onContactInfo(); setDropdownOpen(false); }}>
                                    ℹ️ Contact Info
                                </button>
                            )}

                            <button onClick={() => { navigate("/starred"); setDropdownOpen(false); }}>
                                ⭐ Starred Messages
                            </button>

                            <button onClick={() => { onCallHistory(); setDropdownOpen(false); }}>
                                📞 Call History
                            </button>

                            <button onClick={() => { onBackupRestore(); setDropdownOpen(false); }}>
                                💾 Backup & Restore
                            </button>

                            <button onClick={() => { onAnalytics(); setDropdownOpen(false); }}>
                                📊 Chat Analytics
                            </button>

                            <button onClick={() => { onPhoto(); setDropdownOpen(false); }}>
                                📷 Change Profile Photo
                            </button>

                            {myPhoto && (
                                <button onClick={() => { onRemovePhoto(); setDropdownOpen(false); }}>
                                    🗑️ Remove Profile Photo
                                </button>
                            )}

                            <button onClick={() => { onToggleTheme(); setDropdownOpen(false); }}>
                                🌓 Switch Theme
                            </button>

                            {selectedUser?.email !== "ai@chatapp.com" && !selectedUser?.isGroup && (
                                <button
                                    id="blockBtn"
                                    onClick={() => { onToggleBlock(); setDropdownOpen(false); }}
                                    style={{ color: isBlocked ? "var(--accent-red)" : "inherit" }}
                                >
                                    {isBlocked ? "🔓 Unblock User" : "🚫 Block User"}
                                </button>
                            )}

                            <div style={{ height: "1px", background: "var(--border-light)", margin: "4px 0" }} />

                            <button
                                className="delete-btn"
                                onClick={() => { onDeleteHistory(); setDropdownOpen(false); }}
                                style={{ color: "var(--accent-red)" }}
                            >
                                🗑️ Delete History
                            </button>

                            <button
                                onClick={() => { onLogout(); setDropdownOpen(false); }}
                                style={{ color: "var(--accent-red)" }}
                            >
                                🚪 Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}