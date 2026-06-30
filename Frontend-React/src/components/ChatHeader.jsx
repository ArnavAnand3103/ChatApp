import {useEffect,useState} from 'react';

import {useAuth} from '../context/AuthContext';

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
    onPhotoClick
}){
    const {user}=useAuth();

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
                    <button onClick={onShowGroupInfo}>
                          ℹ️ Group Info
                    </button>
                )}
                <button onClick={onToggleTheme}>Theme</button>
                <button onClick={onPhoto}>Photo</button>
                <button onClick={onToggleSearch}>
                    🔍 Search
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