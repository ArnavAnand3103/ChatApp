import {useState,useEffect} from 'react';
import {createPortal} from 'react-dom';

import MediaModal from './MediaModal';
import { starMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";


export default function Message({msg,currentUser,status,onReply, searchText}){

    const [openMedia,setOpenMedia]=useState(null);
    const [showMenu,setShowMenu]=useState(false);
    const [menuPos,setMenuPos]=useState({
        x:0,
        y:0
    });
    const {token}=useAuth();
useEffect(()=>{
    const closeMenu=()=>{
        setShowMenu(false);
    };
    window.addEventListener("click",closeMenu);
    return ()=>{
        window.removeEventListener("click",closeMenu);
    };
},[]);

    const isMe=msg.from===currentUser.email;

    let statusIcon="";

 if (status === "sent") statusIcon = "✔";       
  if (status === "delivered") statusIcon = "✔✔";
  if(status==="seen") statusIcon="✔✔";

    return(
        <>
            <div 
            id={`msg-${msg._id}`}
            className={`message ${isMe ? 'me' : 'other'}`}
       onContextMenu={(e)=>{

    e.preventDefault();

    const menuWidth = 180;
    const menuHeight = 170;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
    }

    setMenuPos({
        x,
        y
    });

    setShowMenu(true);

}}>
               {msg.replyTo && (
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
                color: "#ddd"
            }}
        >
            {msg.replyText}
        </div>
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

    <span>
        {msg.messageType !== "media" && msg.message}
    </span>

</div>

                {msg.mediaUrl && (
                    (msg.messageType==="media"||msg.messageType==="image")?(
                        <img src={msg.mediaUrl} width="200"
                        style={{cursor:"pointer",maxWidth:"240px",borderRadius:"10px", display:"block", marginTop: msg.message ? "8px" : "0"}}
                        onClick={()=>setOpenMedia({
                            url:msg.mediaUrl,
                            type:"image"
                        })
                    }/>
                    ):(
                        <video src={msg.mediaUrl} width="200" controls
                        style={{cursor:"pointer",maxWidth:"240px",borderRadius:"10px", display:"block", marginTop: msg.message ? "8px" : "0"}}
                        onClick={()=>
                            setOpenMedia({
                                url:msg.mediaUrl,
                                type:"video"
                            })
                        }/>
                    )
                )}

                <div className="msg-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <span style={{marginLeft: "5px", color: status === "seen" ? "#60a5fa" : "inherit"}}>{statusIcon}</span>}
                </div>
            </div>
  

            {openMedia&&(
                <MediaModal
                mediaUrl={openMedia.url}
                type={openMedia.type}
                onClose={()=>setOpenMedia(null)}/>


            )}

            {showMenu &&
    createPortal(

        <div
            style={{
                position: "fixed",
                left: menuPos.x,
                top: menuPos.y,
                background: "#202c33",
                color: "white",
                borderRadius: "10px",
                width: "180px",
                boxShadow: "0 8px 25px rgba(0,0,0,.45)",
                overflow: "hidden",
                zIndex: 999999
            }}
        >

            <div
                onClick={()=>{
                    onReply(msg);
                    setShowMenu(false);
                }}
                style={{
                    padding:"12px 18px",
                    cursor:"pointer"
                }}
            >
                ↩ Reply
            </div>

            <div
                style={{
                    padding:"12px 18px",
                    cursor:"pointer"
                }}
            >
                📋 Copy
            </div>

            <div
                onClick={async()=>{
                    const data=await starMessage(token,msg._id);
                    if(data.message){
                        msg.starred=data.starred;
                        setShowMenu(false);
                    }
                }}
                style={{
                    padding:"12px 18px",
                    cursor:"pointer"
                }}
            >
               {msg.starred ? "⭐ Unstar" : "⭐ Star"}
            </div>

            <div
                style={{
                    padding:"12px 18px",
                    cursor:"pointer"
                }}
            >
                ↪ Forward
            </div>

        </div>,

        document.body

    )
}
        </>
    );
}