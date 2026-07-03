import { useEffect, useState } from 'react';
import Message from './Message';
import { fetchMessages ,fetchGroupMessages} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showNotification } from '../../utils/notification';
import {useRef} from 'react'

export default function Chat({
    selectedUser,
    socket,
    isBlocked,
    showSearch: externalShowSearch,
    setShowSearch: externalSetShowSearch,
    searchText: externalSearchText,
    setSearchText: externalSetSearchText,
    matchedIndexes: externalMatchedIndexes,
    setMatchedIndexes: externalSetMatchedIndexes,
    currentMatch: externalCurrentMatch,
    setCurrentMatch: externalSetCurrentMatch
}) {

    const { user, token } = useAuth();

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [replyMessage,setReplyMessage]=useState(null);
    const [searchText,setSearchText]=useState("");
    const [showSearch,setShowSearch]=useState(false);
    const [matchedIndexes,setMatchedIndexes]=useState([]);
    const [currentMatch,setCurrentMatch]=useState(0);
    const [statusMap, setStatusMap] = useState({});
    const [isTyping, setIsTyping] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const bottomRef=useRef(null);
    const messageRefs=useRef([]);
    const channelRef=useRef(null);
    const typingTimeoutRef=useRef(null);
    const isSearchVisible = externalShowSearch ?? showSearch;
    const searchTextValue = externalSearchText ?? searchText;
    const matchedIndexesValue = externalMatchedIndexes ?? matchedIndexes;
    const currentMatchValue = externalCurrentMatch ?? currentMatch;

    const setSearchOpen = (nextValue) => {
        if (externalSetShowSearch) {
            externalSetShowSearch(nextValue);
            return;
        }
        setShowSearch(nextValue);
    };

    const setSearchQuery = (nextValue) => {
        if (externalSetSearchText) {
            externalSetSearchText(nextValue);
            return;
        }
        setSearchText(nextValue);
    };

    const setMatchedList = (nextValue) => {
        if (externalSetMatchedIndexes) {
            externalSetMatchedIndexes(nextValue);
            return;
        }
        setMatchedIndexes(nextValue);
    };

    const setMatchIndex = (nextValue) => {
        if (externalSetCurrentMatch) {
            externalSetCurrentMatch(nextValue);
            return;
        }
        setCurrentMatch(nextValue);
    };

    useEffect(()=>{
        const channel=new BroadcastChannel("project2-chat-sync");
        channelRef.current=channel;

        channel.onmessage=(event)=>{
            const payload=event.data;
            if(!payload||payload.type!=="incoming"||!payload.message) return;
            const msg=payload.message;
            const from=msg.fromEmail||msg.from;
            const to=msg.toEmail||msg.to;
            const isCurrentChat=from===selectedUser?.email||to===selectedUser?.email;
            if(isCurrentChat){
                setMessages(prev => {
                    const isDuplicate = prev.some(m => (m._id && m._id === msg._id) || (m.clientMessageId && m.clientMessageId === msg.clientMessageId));
                    if (isDuplicate) return prev;
                    return [...prev, msg];
                });
            }
        };

        return ()=>channel.close();
    },[selectedUser]);

    const markMessageSeen = () => {
        if (!socket || !selectedUser) return;

        const unseenIds = messages
            .filter(m => m.to === user.email && m.status !== "seen")
            .map(m => m._id);

        if (unseenIds.length > 0) {
            socket.emit("markSeen", {
                messageIds: unseenIds,
                from: selectedUser.email
            });
        }
    };

    useEffect(() => {
        if (!selectedUser) return;

        const loadMessages = async () => {
            //Group selected
            if(selectedUser?.isGroup){
                const data=await fetchGroupMessages(
                    token,
                    selectedUser._id
                );
                setMessages(data);
                return;
            }
            const data = await fetchMessages(token, selectedUser.email);
            setMessages(data);
            setStatusMap({});

            setTimeout(() => {
                markMessageSeen();
            }, 200);
        };

        loadMessages();
    }, [selectedUser, token]);

    useEffect(() => {
        if (!socket) return;

        const handler = (msg) => {
            const from = msg.fromEmail || msg.from;
            const to = msg.toEmail || msg.to;
            if (
                from === selectedUser?.email ||
                to === selectedUser?.email
            ) {
                setMessages(prev => {
                    const isDuplicate = prev.some(m => (m._id && m._id === msg._id) || (m.clientMessageId && m.clientMessageId === msg.clientMessageId));
                    if (isDuplicate) return prev;
                    return [...prev, msg];
                });
            }
            else {
                showNotification("New Message", msg.messageType === "media" ? "Sent a media message" : msg.message);
            }

            if (msg.clientMessageId) {
                setStatusMap(prev => ({
                    ...prev,
                    [msg.clientMessageId]: msg.status || "delivered"
                }));
            }

            channelRef.current?.postMessage({type:"incoming",message:msg});
        };

        const statusHandler = ({ status, clientMessageId }) => {
            if (!clientMessageId) return;
            setStatusMap(prev => ({
                ...prev,
                [clientMessageId]: status || prev[clientMessageId] || "delivered"
            }));
        };

        const chatDeletedHandler = ({ withUser }) => {
            if (withUser === selectedUser?.email) {
                setMessages([]);
            }
        };

        socket.on("receiveMessage", handler);
        socket.on("messageStatus", statusHandler);
        socket.on("chatDeleted", chatDeletedHandler);

        return () => {
            socket.off("receiveMessage", handler);
            socket.off("messageStatus", statusHandler);
            socket.off("chatDeleted", chatDeletedHandler);
        };

    }, [socket, selectedUser]);

    useEffect(() => {
        if (!socket) return;

        const typingHandler = ({ from }) => {
            if (from === selectedUser?.email) setIsTyping(true);
        };

        const stopTypingHandler = ({ from }) => {
            if (from === selectedUser?.email) setIsTyping(false);
        };

        const seenHandler = ({ messageIds }) => {
            setStatusMap(prev => {
                const updated = { ...prev };
                messageIds.forEach(id => {
                    updated[id] = "seen";
                });
                return updated;
            });
        };

        socket.on("showTyping", typingHandler);
        socket.on("hideTyping", stopTypingHandler);
        socket.on("messagesSeen", seenHandler);

        return () => {
            socket.off("showTyping", typingHandler);
            socket.off("hideTyping", stopTypingHandler);
            socket.off("messagesSeen", seenHandler);
        };

    }, [socket, selectedUser]);

    useEffect(()=>{

        bottomRef.current?.scrollIntoView({behavior:"smooth"});

    },[messages]);
    useEffect(()=>{
        if(!socket) return;

        const handler=(msg)=>{
            if(msg.groupId!=null&&String(msg.groupId)===String(selectedUser?._id)){
                setMessages(prev=>{
                    const isDuplicate=prev.some(m=>m._id&&m._id===msg._id?.toString());
                    if(isDuplicate) return prev;
                    return [...prev,msg];
                });
            }
        };
        socket.on("receiveGroupMessage",handler);

        return()=>socket.off("receiveGroupMessage",handler);
    },[socket,selectedUser])
    useEffect(()=>{
        if(!searchTextValue.trim()){
            setMatchedList([]);
            setMatchIndex(0);
            return;
        }
        const matches=[];
        messages.forEach((msg,index)=>{
            if(
                msg.message &&
                msg.message.toLowerCase().includes(searchTextValue.toLowerCase())

            ){
                matches.push(index);
            }
        });
        setMatchedList(matches);
        setMatchIndex(0);
    },[searchTextValue,messages]);
    useEffect(()=>{
        if(matchedIndexesValue.length===0) return;
        const index=matchedIndexesValue[currentMatchValue];
        messageRefs.current[index]?.scrollIntoView({
            behavior:"smooth",
            block:"center"
        });
    },[currentMatchValue,matchedIndexesValue]);

    const sendMessage = async () => {

           if(selectedUser?.isGroup){
            if(!text.trim()) return;
            socket.emit("groupMessage",{
                groupId:selectedUser._id,
                message:text
            });
            setText("");
            return;
        }
        if (isBlocked) return;
        if (!text.trim() && !file) return;

        const clientMessageId = Date.now().toString();

        let mediaUrl = "";
        let messageType = "text";

        if (file) {
            mediaUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read media"));
                reader.readAsDataURL(file);
            });
            messageType = "media";
        }

        const msg = {
            to: selectedUser.email,
            message: text,
            messageType,
            mediaUrl,
            clientMessageId,

             replyTo: replyMessage?._id || null,
            replyText: replyMessage?.message || "",
            replySender: replyMessage?.user || ""
        };

        socket.emit("privateMessage", msg);

        socket.emit("stopTyping", {
            to: selectedUser.email
        });

        setMessages(prev => [
            ...prev,
            {
                ...msg,
                from: user.email,
                createdAt: new Date()
            }
        ]);

        setStatusMap(prev => ({
            ...prev,
            [clientMessageId]: "sent"
        }));
     
        
        setText("");
        setFile(null);
        setPreview(null);
        setReplyMessage(null);
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };
    const handleForwardMessage=(targetUser,message)=>{
        
    }
        
    return (
        <>
            <div
            style={{
              display: "flex",
             justifyContent: "flex-end",
              padding: "10px"
             }}
>
             <button
        onClick={() => setSearchOpen(!isSearchVisible)}
        style={{
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer"
        }}
    >
        🔍 Search
    </button>
</div>
                  {isSearchVisible && (

                 <div
                 style={{
                 padding: "10px",
                background: "#202c33",
                display:"flex",
                gap:"8px",
                alignItems:"center"
             }}
    >

        <input
            value={searchTextValue}
            onChange={(e)=>
                setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            style={{
              flex:1,
              padding:"10px",
              borderRadius:"8px",
              border:"none"
            }}
        />
        <button
        disabled={matchedIndexesValue.length===0}
        onClick={()=>
            setMatchIndex(prev=>
                prev===0
                ?matchedIndexesValue.length-1
                :prev-1
            )
        }
        >
              ▲
        </button>
        <button
        disabled={matchedIndexesValue.length===0}
        onClick={()=>
            setMatchIndex(prev=>
                prev===matchedIndexesValue.length-1
                ?0
                :prev+1
            )
        }
        >
              ▼
        </button>
        <span>
            {matchedIndexesValue.length===0
            ?"0/0"
            : `${currentMatchValue+1}/${matchedIndexesValue.length}`}
        </span>
        <button
        onClick={()=>{
            setSearchOpen(false);
            setSearchQuery("");
        }}
        >
              ✕
        </button>

    </div>

)}
            <div className="messages-container" id="messagesBox">
                {messages.map((msg, i) => (
                    <div
                    key={msg._id||i}
                    ref={(el)=>(messageRefs.current[i]=el)}
                    >
                    
                    <Message
                      
                        msg={msg}
                        currentUser={user}
                        status={statusMap[msg.clientMessageId]}
                        onReply={setReplyMessage}
                        searchText={searchTextValue}
                        setMessages={setMessages}
                        onForwardMessage={handleForwardMessage}

                    />
                    </div>
                
                ))}
                <div ref={bottomRef}></div>
            </div>

            {preview && (
                <div style={{ margin: "10px",padding:"10px",borderRadius:"12px",background:"rgba(255,255,255,0.04)",display:"inline-block" }}>
                    {file.type.startsWith("image") ? (
                        <img src={preview} width="200" />
                    ) : (
                        <video src={preview} width="200" controls />
                    )}
                </div>
            )}

            {isBlocked && (
                <div style={{ color: "#ef4444", margin: "6px 8px",fontSize:"12px", paddingLeft:"30px" }}>
                    You have blocked this user
                </div>
            )}
            {replyMessage && (

    <div
        style={{
            background: "#2a2a2a",
            borderLeft: "4px solid #25D366",
            padding: "10px",
            margin: "10px",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}
    >

        <div>

            <div
                style={{
                    color: "#25D366",
                    fontWeight: "bold",
                    fontSize: "13px"
                }}
            >
                Replying to {replyMessage.user}
            </div>

            <div
                style={{
                    color: "#ddd",
                    fontSize: "14px"
                }}
            >
                {replyMessage.message}
            </div>

        </div>

        <button
            onClick={() => setReplyMessage(null)}
            style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "18px"
            }}
        >
            ✕
        </button>

    </div>

)}
  

            <div className="input-bar">
                <button className="send-btn" title="Send image" onClick={() => document.getElementById('mediaInput').click()}>+</button>
                <input
                    value={text}
                    disabled={isBlocked && !selectedUser?.isGroup}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (!selectedUser?.email || !socket) return;
                        socket.emit("typing", { to: selectedUser.email });
                        if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                        }
                        typingTimeoutRef.current = setTimeout(() => {
                            socket.emit("stopTyping", { to: selectedUser.email });
                        }, 1500);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                    }}
                    placeholder="Write a message..."
                    id="msgInput"
                />

                <input
                    id="mediaInput"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    style={{display:"none"}}
                />

                <button className="send-btn" onClick={sendMessage}>
                    ➤
                </button>
            </div>
        </>
    );
}