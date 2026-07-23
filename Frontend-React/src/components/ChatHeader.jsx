import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {useAuth} from '../context/AuthContext';
import {useCall} from '../context/CallContext';

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
    onBackup
}){
    const {user}=useAuth();
    const navigate=useNavigate();
    const { groupCallActiveStatusMap, setActiveGroupCall, setCallStatus } = useCall();

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

    const initials = String(selectedUser?.name||"?").slice(0,1).toUpperCase();


    return(
        <div className="chat-header">
            <div className="header-user">
              <div
    className="avatar"
    onClick={onPhotoClick}
    style={{
        cursor: selectedUser?.photo ? "pointer" : "default"
    }}
>

    {selectedUser?.isGroup ? (

        selectedUser.photo ? (

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

        ) : (

            "👥"

        )

    ) : (

        selectedUser ? (

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

        ) : (

            initials

        )

    )}

</div>
                <div className="header-info">
                    <div className="header-name" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span>{selectedUser?.name||"Select User"}</span>
                        {selectedUser && !selectedUser.isGroup && selectedUser.email !== "ai@chatapp.com" && (
                            <span 
                                style={{ 
                                    fontSize: "11px", 
                                    color: "#10b981", 
                                    background: "rgba(16, 185, 129, 0.15)", 
                                    padding: "2px 8px", 
                                    borderRadius: "12px", 
                                    fontWeight: "600",
                                    border: "1px solid rgba(16, 185, 129, 0.3)"
                                }} 
                                title="End-to-End Encrypted with RSA-OAEP + AES-GCM"
                            >
                                🔒 End-to-End Encrypted
                            </span>
                        )}
                        {selectedUser?.isGroup && (
                            <span 
                                style={{ 
                                    fontSize: "11px", 
                                    color: "#10b981", 
                                    background: "rgba(16, 185, 129, 0.15)", 
                                    padding: "2px 8px", 
                                    borderRadius: "12px", 
                                    fontWeight: "600",
                                    border: "1px solid rgba(16, 185, 129, 0.3)"
                                }} 
                                title="End-to-End Encrypted Group with AES-GCM 256 + RSA Key Wrapping"
                            >
                                🔒 End-to-End Encrypted Group
                            </span>
                        )}
                    </div>
                    <div
    id="headerStatus"
    style={{
        fontSize: "13px",
        color: "var(--text-muted)",
        marginTop: "4px",
        fontWeight: 500
    }}
>
{
    selectedUser?.email === "ai@chatapp.com"
        ? "Powered by Groq"
        : statusText
}
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
            

            <div className="header-actions">
                {selectedUser?.isGroup&&(
                    <>
                        <button onClick={onShowGroupInfo}>
                              ℹ️ Group Info
                        </button>
                        {groupCallActiveStatusMap?.[selectedUser?._id]?.isActive ? (
                            <button
                                onClick={handleJoinGroupCall}
                                style={{
                                    background: "#10b981",
                                    color: "white",
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    fontWeight: "600",
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
                                >
                                    📞
                                </button>
                                <button
                                    onClick={() => handleStartGroupCall("video")}
                                    title="Start Group Video Call"
                                >
                                    📹
                                </button>
                            </>
                        )}
                    </>
                )}
{
!selectedUser?.isGroup &&
selectedUser?.email !== "ai@chatapp.com" && (

<>
    <button
        onClick={onAudioCall}
        title="Audio Call"
    >
        📞
    </button>

    <button
        onClick={onVideoCall}
        title="Video Call"
    >
        📹
    </button>
</>

)}
                <button onClick={onToggleTheme}>Theme</button>
                <button onClick={onPhoto}>Photo</button>
                                <button onClick={onToggleSearch}>Search</button>
               <button onClick={()=>navigate("/starred")}>
                 ⭐ Starred
               </button>
                <button onClick={onAnalytics}>Analytics</button>
                <button
                    id="backupBtn"
                    onClick={onBackup}
                    title="Backup & Export"
                    style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "13px"
                    }}
                >
                    ☁️ Backup
                </button>
             {
selectedUser?.email !== "ai@chatapp.com" && (

<button
    id="blockBtn"
    onClick={onToggleBlock}
>
    {isBlocked ? "Unblock" : "Block"}
</button>

)}
                <button className="delete-btn" onClick={onDeleteHistory}>Delete History</button>
                <button onClick={onLogout}>Logout</button>
            </div>
        </div>
    );
}