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
    onVideoCall
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
                    <div className="header-name">{selectedUser?.name||"Select User"}</div>
                    <div id="headerStatus" style={{fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 500}}>
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
                {!selectedUser?.isGroup && (

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
                <button id="blockBtn" 
                        onClick={onToggleBlock}
                        style={{ color: isBlocked ? "var(--accent-red)" : "var(--text-muted)" }}>
                    {isBlocked?"Unblock":"Block"}
                </button>
                <button className="delete-btn" onClick={onDeleteHistory}>Delete History</button>
                <button onClick={onLogout}>Logout</button>
            </div>
        </div>
    );
}