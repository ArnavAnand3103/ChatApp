import {useState,useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import VoiceMessage from "./VoiceMessage";
import LocationMessage from "./LocationMessage";
import LiveLocationMessage from "./LiveLocationMessage";

import MediaModal from './MediaModal';
import { starMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ForwardModal from "../ForwardModal";



export default function Message({msg,currentUser,status,onReply,onEdit, onDeleteForMe,onDeleteForEveryone, onReact, searchText,setMessages,onForwardMessage, stopLiveLocation,}){

    const [openMedia,setOpenMedia]=useState(null);
    const [showForward,setShowForward]=useState(false);
    const [showMenu,setShowMenu]=useState(false);

   
  
    const [menuPos,setMenuPos]=useState({
        x:0,
        y:0
    });
    const [reactionPopup, setReactionPopup] = useState(null);
const [showReactionPopup, setShowReactionPopup] = useState(false);
    const {token}=useAuth();
useEffect(()=>{
    const closeMenu=()=>{
        setShowMenu(false);
    };
   
},[]);

    const isMe=msg.from===currentUser.email;
    if (msg.messageType === "location") {
    console.log("LOCATION MESSAGE:", msg);
}

    let statusIcon="";

 if (status === "sent" || status === "offline") statusIcon = "✔";       
     if (status === "delivered") statusIcon = "✔✔";
     if(status==="seen") statusIcon="✔✔";

     
  

    return(
        <>
            <div 
            id={`msg-${msg._id}`}
className={`message ${isMe ? "me" : "other"} ${
    msg.messageType === "location" ? "location-message" : ""
}`}
       onContextMenu={(e)=>{

        if (msg.deletedForEveryone) {
        return;
    }

    e.preventDefault();

    const menuWidth = 180;
    const menuHeight = 340;
    const reactionBarWidth = 470;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
    }
    if (x < 10) {
    x = 10;
}

    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
    }

    if (y < 70) {
    y = 70;
}

    setMenuPos({
        x,
        y
    });

    window.dispatchEvent(new CustomEvent("closeAllMenus"));
    setShowMenu(true);

}}>
               {!msg.deletedForEveryone && msg.replyTo && (
    <div
             onClick={()=>{
            const element=document.getElementById(`msg-${msg.replyTo}`);

            if(element){

                element.scrollIntoView({
                    behavior:"smooth",
                    block:"center"
                });

                element.style.transition="0.3s";
                element.style.boxShadow="0 0 0 3px #25D366";

                setTimeout(()=>{
                    element.style.boxShadow="";
                },1500);
            }
        }}    
        style={{
            background: "rgba(255,255,255,.12)",
            borderLeft: "4px solid #25D366",
            padding: "6px 10px",
            marginBottom: "8px",
            borderRadius: "6px",
            fontSize: "13px"
        }}
    >
        <div
            style={{
                color: "#25D366",
                fontWeight: "bold",
                marginBottom: "3px"
            }}
        >
            {msg.replySender}
        </div>

<div
    style={{
        color: "#ddd",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    }}
>
    {msg.replyText === "🎤 Voice message" ? (
        <>
            <span>🎤</span>
            <span>Voice message</span>
        </>
    ) : msg.replyText === "🖼 Photo" ? (
        <>
            <span>🖼️</span>
            <span>Photo</span>
        </>
    ) : msg.replyText === "🎥 Video" ? (
        <>
            <span>🎥</span>
            <span>Video</span>
        </>
    ) : msg.replyText?.startsWith("📄") ? (
        <>
            <span>📄</span>
            <span>{msg.replyText.replace("📄 ", "")}</span>
        </>
    ) : (
        <span>{msg.replyText}</span>
    )}
</div>
</div>

)}
       {!msg.deletedForEveryone && msg.forwarded && (
    <div
        style={{
            fontSize: "12px",
            color: "#9ca3af",
            fontStyle: "italic",
            marginBottom: "4px"
        }}
    >
        ↪ Forwarded

    </div>
    
    
)}


<div
 
    style={{
        display:"flex",
        alignItems:"center",
        gap:"6px",
        background:
            searchText &&
            msg.message?.toLowerCase().includes(searchText.toLowerCase())
                ? "#ffe066"
                : "transparent",
        color:
            searchText &&
            msg.message?.toLowerCase().includes(searchText.toLowerCase())
                ? "#000"
                : "inherit",
        borderRadius:"6px",
        padding:"2px 4px"
    }}
>

    {msg.starred && (
        <span style={{fontSize:"14px"}}>⭐</span>
    )}

 {msg.deletedForEveryone ? (

    <span
        style={{
            fontStyle: "italic",
            color: "#999"
        }}
    >
        🚫 This message was deleted
    </span>

) : (

    msg.messageType === "text" && (

        <span
            style={{
                background:
                    searchText &&
                    msg.message &&
                    msg.message.toLowerCase().includes(searchText.toLowerCase())
                        ? "#ffe066"
                        : "transparent",

                color:
                    searchText &&
                    msg.message &&
                    msg.message.toLowerCase().includes(searchText.toLowerCase())
                        ? "#000"
                        : "inherit",

                padding: "2px 4px",
                borderRadius: "4px"
            }}
        >
            {msg.message}
        </span>

    )

)}

</div>
{!msg.deletedForEveryone && (

    msg.messageType === "image" && msg.mediaUrl ? (

        <img
            src={msg.mediaUrl}
            width="200"
            style={{
                cursor: "pointer",
                maxWidth: "240px",
                borderRadius: "10px",
                display: "block",
                marginTop: msg.message ? "8px" : "0"
            }}
            onClick={() =>
                setOpenMedia({
                    url: msg.mediaUrl,
                    type: "image"
                })
            }
        />

    ) : msg.messageType === "video" && msg.mediaUrl ? (

        <video
            src={msg.mediaUrl}
            width="200"
            controls
            style={{
                cursor: "pointer",
                maxWidth: "240px",
                borderRadius: "10px",
                display: "block",
                marginTop: msg.message ? "8px" : "0"
            }}
        />

    ) : msg.messageType === "voice" && msg.mediaUrl ? (

        <VoiceMessage
            mediaUrl={msg.mediaUrl}
            isMe={isMe}
        />

    ) : msg.messageType === "location" ? (

    msg.isLive ? (

        <LiveLocationMessage
            msg={msg}
            stopLiveLocation={stopLiveLocation}
            canStop={
                msg.from === currentUser?.email &&
                msg.isLive
            }
        />

    ) : (

        <LocationMessage
            msg={msg}
        />

    )

) : msg.messageType === "document" && msg.mediaUrl ? (

        <a
            href={msg.mediaUrl}
            download={msg.fileName}
            target="_blank"
            rel="noreferrer"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "8px",
                padding: "10px",
                background: "#2a3942",
                borderRadius: "8px",
                color: "white",
                textDecoration: "none"
            }}
        >
            <span style={{ fontSize: "28px" }}>📄</span>

            <div>
                <div>{msg.fileName || "Document"}</div>

                <div
                    style={{
                        fontSize: "12px",
                        color: "#aaa"
                    }}
                >
                    Click to open
                </div>
            </div>
        </a>

    ) : null

)}

           {!msg.deletedForEveryone && (
    <div className="msg-time">
        {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })}

        {msg.edited && (
            <span
                style={{
                    marginLeft: "6px",
                    fontStyle: "italic",
                    fontSize: "11px"
                }}
            >
                (edited)
            </span>
        )}

        {isMe && (
            <span
                style={{
                    marginLeft: "5px",
                    color: status === "seen" ? "#60a5fa" : "inherit"
                }}
            >
                {statusIcon}
            </span>
        )}
    </div>
        
)}
{msg.reactions?.length > 0 && (() => {

    const grouped = {};

    msg.reactions.forEach(reaction => {
        grouped[reaction.emoji] = (grouped[reaction.emoji] || 0) + 1;
    });


    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                marginTop: "4px",
                flexWrap: "wrap"
            }}
        >
            {Object.entries(grouped).map(([emoji, count]) => {

    const reactedByMe = msg.reactions.some(
        reaction =>
            reaction.user === currentUser.email &&
            reaction.emoji === emoji
    );

    return (
      <span
    key={emoji}
    onClick={() => {

     const users = msg.reactions
    .filter(r => r.emoji === emoji)
    .map(r =>r.name|| r.user);

        setReactionPopup({
            emoji,
            users
        });

        setShowReactionPopup(true);

    }}
    style={{
        cursor: "pointer",
        background: reactedByMe
            ? "#25D366"
            : "#2a3942",

        color: reactedByMe
            ? "black"
            : "white",

        borderRadius: "12px",
        padding: "3px 10px",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontWeight: reactedByMe
            ? "bold"
            : "normal",

        border: reactedByMe
            ? "1px solid #128C7E"
            : "none"
    }}
>
            <span>{emoji}</span>

            {count > 1 && (
                <span
                    style={{
                        fontSize: "12px"
                    }}
                >
                    {count}
                </span>
            )}
        </span>
    );

})}
        </div>
    );

})()}

            </div>
  

            {openMedia&&(
                <MediaModal
                mediaUrl={openMedia.url}
                type={openMedia.type}
                onClose={()=>setOpenMedia(null)}/>


            )}
            {showReactionPopup && reactionPopup && (
    <div
        onClick={() => setShowReactionPopup(false)}
        style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
        }}
    >
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                background: "#202c33",
                color: "white",
                padding: "20px",
                borderRadius: "12px",
                minWidth: "260px"
            }}
        >
            <h3
                style={{
                    marginTop: 0,
                    textAlign: "center"
                }}
            >
                {reactionPopup.emoji}
            </h3>

            {reactionPopup.users.map((userEmail, index) => (
                <div
                    key={index}
                    style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #444"
                    }}
                >
                    {userEmail}
                </div>
            ))}

            <button
                onClick={() => setShowReactionPopup(false)}
                style={{
                    marginTop: "15px",
                    width: "100%",
                    padding: "8px",
                    cursor: "pointer"
                }}
            >
                Close
            </button>
        </div>
    </div>
)}

 {showMenu &&
    createPortal(

<>
    {/* Floating Emoji Bar */}
    <div
        style={{
            position: "fixed",
          left: Math.min(
                     menuPos.x,
                 window.innerWidth - 360
                    ),
           top: Math.max(
                10,
                 menuPos.y - 70
                ),
            background: "#202c33",
            borderRadius: "30px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 25px rgba(0,0,0,.45)",
            zIndex: 999999,

        animation: "reactionBarPop .18s ease-out",
        transformOrigin: "top center"
        }}
    >
        {["😀","😂","😍","😮","😢","🙏","👍","❤️"].map((emoji)=>(
            <span
                key={emoji}
                onClick={()=>{
                    onReact(msg,emoji);
                    setShowMenu(false);
                }}
                style={{
                    fontSize:"22px",
                    cursor:"pointer",
                    transition:"transform .15s",
                    borderRadius: "50%",
                    padding: "4px"
                }}
                onMouseEnter={(e)=>{
                    e.currentTarget.style.transform="scale(1.25)";
                    e.currentTarget.style.background = "#2f3b43";
                }}
                onMouseLeave={(e)=>{
                    e.currentTarget.style.transform="scale(1)";
                    e.currentTarget.style.background = "transparent";
                }}
            >
                {emoji}
            </span>
        ))}
    </div>

    {/* Context Menu */}
    <div
        style={{
            position:"fixed",
            left:menuPos.x,
            top:menuPos.y,
            background:"#202c33",
            color:"white",
            borderRadius:"10px",
            width:"190px",
            boxShadow:"0 8px 25px rgba(0,0,0,.45)",
            overflow:"hidden",
            zIndex:999999
        }}
    >

        <div
            onClick={()=>{
                onReply(msg);
                setShowMenu(false);
            }}
            style={{
                padding:"12px 18px",
                cursor:"pointer",
                transition: "background .15s ease",
            }}
            onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
        >
            ↩ Reply
        </div>

       {msg.messageType === "text" && (
    <div
        onClick={async () => {
            try {
                await navigator.clipboard.writeText(msg.message);
                alert("Message copied!");
            } catch (err) {
                alert("Failed to copy message");
            }

            setShowMenu(false);
        }}
        style={{
            padding: "12px 18px",
            cursor: "pointer",
            transition: "background .15s ease",
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2f3b43";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
        }}
    >
        📋 Copy
    </div>
)}

        {isMe && !msg.deletedForEveryone && msg.messageType==="text" && (
            <div
                onClick={()=>{
                    onEdit(msg);
                    setShowMenu(false);
                }}
                style={{
                    padding:"12px 18px",
                    cursor:"pointer",
                    transition: "background .15s ease",
                }}
                   onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
                
            >
                ✏️ Edit
            </div>
        )}

        <div
            onClick={async()=>{
                const data=await starMessage(token,msg._id);

                if(data.message){
                    setMessages(prev=>
                        prev.map(m=>
                            m._id===msg._id
                                ? {...m,starred:data.starred}
                                : m
                        )
                    );
                }

                setShowMenu(false);
            }}
            style={{
                padding:"12px 18px",
                cursor:"pointer",
                 transition: "background .15s ease",
            }}
               onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
        >
            {msg.starred ? "⭐ Unstar" : "⭐ Star"}
        </div>

        <div
            onClick={()=>{
                setShowForward(true);
                setShowMenu(false);
            }}
            style={{
                padding:"12px 18px",
                cursor:"pointer",
                transition: "background .15s ease",
            }}
                   onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
                
        >
            ↪ Forward
        </div>

        <div
            onClick={()=>{
                onDeleteForMe(msg);
                setShowMenu(false);
            }}
            style={{
                padding:"12px 18px",
                cursor:"pointer",
                color:"#ef4444",
                transition: "background .15s ease",
            }}
               onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
        >
            🗑 Delete for Me
        </div>

        {isMe && !msg.deletedForEveryone && (
            <div
                onClick={()=>{
                    onDeleteForEveryone(msg);
                    setShowMenu(false);
                }}
                style={{
                    padding:"12px 18px",
                    cursor:"pointer",
                    color:"#ef4444",
                     transition: "background .15s ease",
                }}
                  onMouseEnter={(e)=>{
              e.currentTarget.style.background = "#2f3b43";
                }}

            onMouseLeave={(e)=>{
            e.currentTarget.style.background = "transparent";
            }}
            >
                🚫 Delete for Everyone
            </div>
        )}

    </div>

</>,

document.body

)
}
{showForward && (
    <ForwardModal
    
    onClose={()=>setShowForward(false)}
    onForward={(user)=>{
        onForwardMessage(user,msg);
        setShowForward(false);
    }}
    />
)}
        </>
    );
}