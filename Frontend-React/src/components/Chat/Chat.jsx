import { useEffect, useState } from 'react';
import Message from './Message';
import { fetchMessages, fetchGroupMessages, chatWithAI, generateImage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showNotification } from '../../utils/notification';
import {useRef} from 'react';
import { getCurrentLocation } from "../../utils/location";
import IncomingCall from "../Call/IncomingCall";
import MediaModal from "./MediaModal";
import { e2eeAvailable, encryptPrivateForUser, decryptPrivateForMe, encryptGroupForChat, decryptGroupForMe, ensureGroupSenderKey, processGroupSenderKey } from "../../services/e2ee";

const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Chat({
    selectedUser,
    socket,
    isBlocked,
    refreshMessagesSignal,
    showSearch: externalShowSearch,
    setShowSearch: externalSetShowSearch,
    searchText: externalSearchText,
    setSearchText: externalSetSearchText,
    matchedIndexes: externalMatchedIndexes,
    setMatchedIndexes: externalSetMatchedIndexes,
    currentMatch: externalCurrentMatch,
    setCurrentMatch: externalSetCurrentMatch
}) {

    const { user, token, e2eeState } = useAuth();

    const [messages, setMessages] = useState([]);
    const [showLocationMenu, setShowLocationMenu] = useState(false);
    const [showLiveLocationModal, setShowLiveLocationModal] = useState(false);
    const [isSharingLiveLocation, setIsSharingLiveLocation] = useState(false);

    const [text, setText] = useState("");
    const [replyMessage,setReplyMessage]=useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [searchText,setSearchText]=useState("");
    const [showSearch,setShowSearch]=useState(false);
    const [matchedIndexes,setMatchedIndexes]=useState([]);
    const [currentMatch,setCurrentMatch]=useState(0);
    const [statusMap, setStatusMap] = useState({});
    const [isTyping, setIsTyping] = useState(false);

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [files, setFiles] = useState([]);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [documentPreview, setDocumentPreview] = useState(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const [voiceBlob, setVoiceBlob] = useState(null);
    const [voicePreview, setVoicePreview] = useState("");
    const [aiTyping, setAiTyping] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const liveLocationWatchRef = useRef(null);
    const liveLocationIdRef = useRef(null);
    const liveLocationTimerRef = useRef(null);

    const bottomRef = useRef(null);
    const messageRefs = useRef([]);
    const typingTimeoutRef = useRef(null);

    const canE2EE = Boolean(e2eeState?.messageEncryptionEnabled && e2eeAvailable() && user?.email);

    const decryptIncoming = async (msg) => {
        if (!msg || !msg.isEncrypted || !msg.ciphertext) return msg;
        try {
            if (msg.groupId || (msg.to && selectedUser?.isGroup && String(msg.to) === String(selectedUser._id))) {
                const plain = await decryptGroupForMe({ myEmail: user.email, senderEmail: msg.from || msg.fromEmail, senderDeviceId: msg.senderDeviceId, ciphertext: msg.ciphertext });
                const inner = JSON.parse(plain);
                return { ...msg, ...inner, isEncrypted: true, _decrypted: true };
            } else {
                const other = (msg.from === user.email || msg.fromEmail === user.email) ? (msg.to || msg.toEmail) : (msg.from || msg.fromEmail);
                if (msg.from === user.email || msg.fromEmail === user.email) {
                    // own sent encrypted: we stored plaintext locally in optimistic update usually, but if loaded from server decrypt attempt may fail without self-session; keep as-is if already has content
                    if (msg.message || msg.messageType !== 'encrypted') return { ...msg, _decrypted: true };
                }
                const plain = await decryptPrivateForMe({ myEmail: user.email, fromEmail: other, senderDeviceId: msg.senderDeviceId, ciphertext: msg.ciphertext, ciphertextType: msg.ciphertextType });
                const inner = JSON.parse(plain);
                return { ...msg, ...inner, isEncrypted: true, _decrypted: true };
            }
        } catch (e) {
            return { ...msg, message: "🔒 Encrypted message (cannot decrypt)", messageType: "text", _decryptError: true };
        }
    };

    const decryptMany = async (list) => {
        if (!Array.isArray(list)) return list;
        return Promise.all(list.map(decryptIncoming));
    };
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

    const markMessageSeen = (messageList = messages) => {
        if (!socket || !selectedUser) return;

        const unseenIds = messageList
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
                setMessages(await decryptMany(data || []));
                return;
            }
            const data = await fetchMessages(token, selectedUser.email);
            const dec = await decryptMany(data || []);
            setMessages(dec);
            setStatusMap({});

            setTimeout(() => {
                markMessageSeen(dec);
            }, 200);
        };

        loadMessages();
    }, [selectedUser, token, refreshMessagesSignal]);

    useEffect(() => {
        if (!socket) return;

        const handler = async (msg) => {
            const from = msg.fromEmail || msg.from;
            const to = msg.toEmail || msg.to;
            if (
                from === selectedUser?.email ||
                to === selectedUser?.email
            ) {
                const dmsg = await decryptIncoming(msg);
                setMessages(prev => {
                    const duplicateIndex = prev.findIndex(m =>
                        (m._id && dmsg._id && String(m._id) === String(dmsg._id)) ||
                        (m.clientMessageId && dmsg.clientMessageId && m.clientMessageId === dmsg.clientMessageId) ||
                        (!m._id && m.from === dmsg.from && m.message === dmsg.message && m.messageType === dmsg.messageType)
                    );

                    if (duplicateIndex !== -1) {
                        const updated = [...prev];
                        updated[duplicateIndex] = {
                            ...updated[duplicateIndex],
                            ...dmsg,
                            clientMessageId: updated[duplicateIndex].clientMessageId || dmsg.clientMessageId,
                            createdAt: updated[duplicateIndex].createdAt || dmsg.createdAt
                        };
                        return updated;
                    }

                    return [...prev, dmsg];
                });
            }
            else {
                showNotification("New Message", msg.isEncrypted ? "Encrypted message" : (msg.messageType === "media" ? "Sent a media message" : msg.message));
            }

            if (msg.clientMessageId) {
                setStatusMap(prev => ({
                    ...prev,
                    [msg.clientMessageId]: msg.status || "delivered"
                }));
            }
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
        const editHandler=({messageId,message,edited})=>{

            setMessages(prev=>
                prev.map(msg=>
                    msg._id===messageId
                    ?{
                        ...msg,
                        message,
                        edited
                    }
                    :msg
                )
            );
        }
        const deleteHandler = ({ messageId }) => {
    setMessages(prev =>
        prev.filter(msg => msg._id !== messageId)
    );
   

};
const deleteEveryoneHandler = ({ messageId }) => {

    setMessages(prev =>
        prev.map(msg => {

            // Mark the deleted message
            if (msg._id === messageId) {
                return {
                    ...msg,
                    deletedForEveryone: true
                };
            }

            // Update reply preview if this message replied to the deleted one
            if (msg.replyTo === messageId) {
                return {
                    ...msg,
                    replyText: "🚫 This message was deleted"
                };
            }

            return msg;

        })
    );

};
const reactionHandler = ({
    messageId,
    reactions,
    reactedBy,
    emoji,
    messageOwner,
    action
}) => {

   

    

    setMessages(prev =>
        prev.map(msg =>
            msg._id === messageId
                ? {
                    ...msg,
                    reactions
                }
                : msg
        )
    );
  

    if (
        reactedBy !== user.email &&
        messageOwner === user.email &&
       action!=="removed"
    ) {
        showNotification(
            "New Reaction",
            `${reactedBy} reacted ${emoji} to your message`
        );
    }
};

        socket.on("showTyping", typingHandler);
        socket.on("hideTyping", stopTypingHandler);
        socket.on("messagesSeen", seenHandler);
        socket.on("messageEdited", editHandler);
        socket.on("messageDeletedForMe", deleteHandler);
        socket.on("messageDeletedForEveryone", deleteEveryoneHandler);
        socket.on("messageReaction", reactionHandler);
        socket.on("liveLocationUpdated", (data) => {

    setMessages(prev =>
        prev.map(msg =>
            msg.liveLocationId === data.liveLocationId
                ? {
                    ...msg,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    expiresAt: data.expiresAt,
                    isLive: true
                }
                : msg
        )
    );

});
socket.on("liveLocationStopped", ({ liveLocationId,from }) => {

    setMessages(prev =>

        prev.map(msg =>

            msg.liveLocationId === liveLocationId

                ? {

                    ...msg,

                    isLive: false

                }

                : msg

        )

    );
     showNotification(
        "Live Location",
        `${from} stopped sharing live location 🛑`
    );

});
        socket.on("liveLocationStarted", ({ from }) => {

         showNotification(
        "Live Location",
        `${from} started sharing live location 🌍`
    );
    

});

        return () => {
            socket.off("showTyping", typingHandler);
            socket.off("hideTyping", stopTypingHandler);
            socket.off("messagesSeen", seenHandler);
            socket.off("messageEdited", editHandler);
            socket.off("messageDeletedForMe", deleteHandler);
            socket.off("messageDeletedForEveryone", deleteEveryoneHandler);
            socket.off("messageReaction", reactionHandler);
            socket.off("liveLocationUpdated");
            socket.off("liveLocationStopped");
            socket.off("liveLocationStarted");


           
        };

    }, [socket, selectedUser]);

    useEffect(()=>{

        bottomRef.current?.scrollIntoView({behavior:"smooth"});

    },[messages]);
    useEffect(()=>{
        if(!socket) return;

        const handler=async (msg)=>{
            if(msg.groupId!=null&&String(msg.groupId)===String(selectedUser?._id)){
                const dmsg = await decryptIncoming({ ...msg, groupId: msg.groupId });
                setMessages(prev=>{
                    const isDuplicate=prev.some(m=>m._id&&m._id===msg._id?.toString());
                    if(isDuplicate) return prev;
                    return [...prev,dmsg];
                });
            }
        };
        socket.on("receiveGroupMessage",handler);

        const skHandler = async (payload) => {
            try {
                if (!payload || !payload.groupId) return;
                if (payload.from === user.email) return;
                await processGroupSenderKey({ myEmail: user.email, senderEmail: payload.from, senderDeviceId: payload.senderDeviceId, distributionMessage: payload.distributionMessage, distributionId: payload.distributionId, groupId: payload.groupId });
            } catch (e) { console.warn("sender key process failed", e); }
        };
        socket.on("groupSenderKeyDistribution", skHandler);

        return()=>{ socket.off("receiveGroupMessage",handler); socket.off("groupSenderKeyDistribution", skHandler); };
    },[socket,selectedUser, user?.email])
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

    const sendLocation = async () => {

    try {

        const location = await getCurrentLocation();

        if (selectedUser?.isGroup) {

            socket.emit("groupMessage", {

                groupId: selectedUser._id,

                messageType: "location",

                latitude: location.latitude,
                longitude: location.longitude,

                locationName: "",

                isLive: false

            });

        } else {

            socket.emit("privateMessage", {

                to: selectedUser.email,

                messageType: "location",

                latitude: location.latitude,
                longitude: location.longitude,

                locationName: "",

                isLive: false

            });

        }

    } catch (err) {

        console.error(err);

        alert("Unable to get location");

    }

};
const startLiveLocation = (minutes) => {

    if (!navigator.geolocation) {

        alert("Geolocation is not supported.");

        return;

    }

    const liveLocationId = Date.now().toString();

    liveLocationIdRef.current = liveLocationId;

    const expiresAt =
        Date.now() + minutes * 60 * 1000;
      liveLocationTimerRef.current = setTimeout(() => {

    stopLiveLocation();

}, minutes * 60 * 1000);
    liveLocationWatchRef.current =
        navigator.geolocation.watchPosition(

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const liveMessage = {

    _id: liveLocationId,

    from: user.email,

    to: selectedUser?.isGroup
    ? selectedUser._id
    : selectedUser.email,

    messageType: "location",

    latitude,

    longitude,

    locationName: "Live Location",

    isLive: true,

    liveLocationId,

    expiresAt,

    createdAt: new Date()

};
        setMessages(prev => {

    const exists = prev.some(
        msg => msg.liveLocationId === liveLocationId
    );

    if (exists) return prev;

    return [...prev, liveMessage];

});

                if (selectedUser?.isGroup) {

                    socket.emit("groupLiveLocation", {

                        groupId: selectedUser._id,

                        latitude,

                        longitude,

                        liveLocationId,

                        expiresAt

                    });

                }

                else {

                    socket.emit("privateLiveLocation", {

                        to: selectedUser.email,

                        latitude,

                        longitude,

                        liveLocationId,

                        expiresAt

                    });

                }

            },

            (err) => {

                console.error(err);

            },

            {

                enableHighAccuracy: true,

                maximumAge: 0,

                timeout: 10000

            }

        );
        setIsSharingLiveLocation(true);

};
const stopLiveLocation = () => {

    if (!isSharingLiveLocation) return;

    if (liveLocationWatchRef.current !== null) {

        navigator.geolocation.clearWatch(
            liveLocationWatchRef.current
        );

        liveLocationWatchRef.current = null;

    }

    // Clear the auto-stop timer
    if (liveLocationTimerRef.current) {

        clearTimeout(liveLocationTimerRef.current);

        liveLocationTimerRef.current = null;

    }

    setIsSharingLiveLocation(false);

    socket.emit("stopLiveLocation", {

        liveLocationId: liveLocationIdRef.current

    });

};

    const readMediaFile = (selectedFile) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read media"));
        reader.readAsDataURL(selectedFile);
    });

    const getMediaType = (selectedFile) => {
        if (selectedFile.type.startsWith("image")) return "image";
        if (selectedFile.type.startsWith("video")) return "video";
        if (selectedFile.type.startsWith("audio")) return "audio";
        return "document";
    };

    const buildPlainPayload = (base) => JSON.stringify({
        message: base.message || "",
        messageType: base.messageType || "text",
        mediaUrl: base.mediaUrl || "",
        fileName: base.fileName || "",
        replyText: base.replyText || "",
        replySender: base.replySender || "",
        latitude: base.latitude ?? null,
        longitude: base.longitude ?? null,
        locationName: base.locationName || "",
        isLive: !!base.isLive,
        liveLocationId: base.liveLocationId || "",
        expiresAt: base.expiresAt ?? null
    });

    const sendPrivateEncrypted = async (msgObj) => {
        const plaintext = buildPlainPayload(msgObj);
        const enc = await encryptPrivateForUser({ token, fromEmail: user.email, toEmail: selectedUser.email, plaintext });
        socket.emit("privateMessage", {
            to: selectedUser.email,
            clientMessageId: msgObj.clientMessageId,
            replyTo: msgObj.replyTo || null,
            forwarded: !!msgObj.forwarded,
            isEncrypted: true,
            encryptionVersion: 1,
            ciphertext: enc.ciphertext,
            ciphertextType: enc.ciphertextType,
            senderDeviceId: enc.senderDeviceId,
            recipientDeviceId: enc.recipientDeviceId,
            encryptedPayload: null
        });
        setMessages(prev => [...prev, { ...msgObj, from: user.email, createdAt: new Date(), isEncrypted: true, _decrypted: true }]);
    };

    const sendGroupEncrypted = async (groupId, msgObj) => {
        const ensured = await ensureGroupSenderKey({ myEmail: user.email, groupId });
        if (ensured.created && ensured.distributionMessage) {
            socket.emit("groupSenderKeyDistribution", {
                groupId,
                distributionId: ensured.distributionId,
                distributionMessage: ensured.distributionMessage,
                senderDeviceId: await (async()=>{ try { return (await window.chatAppNative.ensureE2EEDevice(user.email)).deviceId; } catch { return null; } })()
            });
        }
        const plaintext = buildPlainPayload(msgObj);
        const enc = await encryptGroupForChat({ myEmail: user.email, groupId, plaintext });
        socket.emit("groupMessage", {
            groupId,
            clientMessageId: msgObj.clientMessageId,
            replyTo: msgObj.replyTo || null,
            forwarded: !!msgObj.forwarded,
            isEncrypted: true,
            encryptionVersion: 1,
            ciphertext: enc.ciphertext,
            ciphertextType: enc.ciphertextType,
            senderDeviceId: enc.senderDeviceId,
            encryptedPayload: { distributionId: enc.distributionId }
        });
        // group messages come back via socket; optimistic add for UX
        setMessages(prev => [...prev, { ...msgObj, from: user.email, to: groupId, groupId, createdAt: new Date(), isEncrypted: true, _decrypted: true }]);
    };

    const sendAdditionalFiles = async (additionalFiles) => {
        for (let index = 0; index < additionalFiles.length; index += 1) {
            const queuedFile = additionalFiles[index];
            const mediaUrl = await readMediaFile(queuedFile);
            const messageType = getMediaType(queuedFile);
            const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const msgBase = { message: "", mediaUrl, messageType, fileName: queuedFile.name, clientMessageId };
            if (selectedUser?.isGroup) {
                if (canE2EE) {
                    await sendGroupEncrypted(selectedUser._id, msgBase);
                } else {
                    socket.emit("groupMessage", { groupId: selectedUser._id, ...msgBase });
                }
            } else {
                if (canE2EE) {
                    await sendPrivateEncrypted({ ...msgBase, to: selectedUser.email });
                } else {
                    const message = { to: selectedUser.email, ...msgBase };
                    socket.emit("privateMessage", message);
                    setMessages((previous) => [...previous, { ...message, from: user.email, createdAt: new Date() }]);
                }
            }
            setUploadProgress(Math.round(((index + 1) / additionalFiles.length) * 100));
        }
    };

const sendMessage = async () => {

    if (editingMessage) {

        socket.emit("editMessage", {
            messageId: editingMessage._id,
            newMessage: text
        });

        setEditingMessage(null);
        setText("");

        return;
    }

    // ---------------- AI CHAT ----------------
    if (selectedUser?.email === "ai@chatapp.com") {
        if (!text.trim()) return;
        const userMsg = text;
        setText("");
        setMessages(prev => [
            ...prev,
            {
                from: user.email,
                to: selectedUser.email,
                message: userMsg,
                createdAt: new Date(),
                messageType: "text"
            }
        ]);

        const lowerPrompt = userMsg.toLowerCase();
        const imageKeywords = ["generate", "draw", "paint", "image", "picture", "photo", "logo", "poster", "wallpaper"];
        const isImageReq = imageKeywords.some(k => lowerPrompt.includes(k));

        setAiTyping(true);
        try {
            if (isImageReq) {
                const res = await generateImage(userMsg);
                setAiTyping(false);
                setMessages(prev => [
                    ...prev,
                    {
                        from: selectedUser.email,
                        to: user.email,
                        mediaUrl: res.imageUrl,
                        message: "",
                        createdAt: new Date(),
                        messageType: "image"
                    }
                ]);
                return;
            }

            const res = await chatWithAI(userMsg);
            await new Promise(r => setTimeout(r, 600));
            setAiTyping(false);
            setMessages(prev => [
                ...prev,
                {
                    from: selectedUser.email,
                    to: user.email,
                    message: res.reply || res.message || "Hello! I am your AI Assistant. How can I assist you?",
                    createdAt: new Date(),
                    messageType: "text"
                }
            ]);
        } catch (err) {
            setAiTyping(false);
            console.error("AI Assistant Error:", err);
            setMessages(prev => [
                ...prev,
                {
                    from: selectedUser.email,
                    to: user.email,
                    message: "Sorry, I encountered an error: " + (err.message || "Something went wrong"),
                    createdAt: new Date(),
                    messageType: "text"
                }
            ]);
        }
        return;
    }

    const queuedFiles = files.length ? files : (file ? [file] : []);
    if (selectedUser?.isGroup) {
        if (!text.trim() && !queuedFiles.length) return;

        let mediaUrl = "";
        let messageType = "text";

        if (file) {
            mediaUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read media"));
                reader.readAsDataURL(file);
            });

            if (file.type.startsWith("image")) {
                messageType = "image";
            } else if (file.type.startsWith("video")) {
                messageType = "video";
            } else if (file.type.startsWith("audio")) {
                messageType = "audio";
            } else {
                messageType = "document";
            }
        }

        const replyData = {
            replyTo: replyMessage?._id || null,
            replyText:
                replyMessage?.messageType === "voice"
                    ? "🎤 Voice message"
                : replyMessage?.messageType === "image"
                    ? "🖼 Photo"
                : replyMessage?.messageType === "video"
                    ? "🎥 Video"
                : replyMessage?.messageType === "document"
                    ? `📄 ${replyMessage.fileName || "Document"}`
                : replyMessage?.messageType === "location"
                    ? (replyMessage?.isLive ? "🌍 Live Location" : "📍 Current Location")
                : replyMessage?.message || "",
            replySender: replyMessage?.user || replyMessage?.from || ""
        };

        const groupBase = {
            message: text,
            mediaUrl,
            messageType,
            fileName: file?.name || "",
            clientMessageId: Date.now().toString(),
            ...replyData
        };

        if (canE2EE) {
            try { await sendGroupEncrypted(selectedUser._id, groupBase); }
            catch (e) { alert("E2EE send failed: " + (e?.message || e)); return; }
        } else {
            socket.emit("groupMessage", {
                groupId: selectedUser._id,
                ...groupBase
            });
        }
        setUploadingMedia(true);
        setUploadProgress(0);
        try {
            await sendAdditionalFiles(queuedFiles.slice(1));
        } finally {
            setUploadingMedia(false);
            setUploadProgress(100);
        }

        setReplyMessage(null);
        setText("");
        setFile(null);
        setPreview(null);
        setFiles([]);
        return;
    }

    if (isBlocked) return;

    if (!text.trim() && !queuedFiles.length) return;


       

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

    if (file.type.startsWith("image")) {
        messageType = "image";
    }
    else if (file.type.startsWith("video")) {
        messageType = "video";
    }
    else if (file.type.startsWith("audio")) {
        messageType = "audio";
    }
    else {
        messageType = "document";
    }
}

        const msg = {
            to: selectedUser.email,
            message: text,
            messageType,
            mediaUrl,
            fileName: file?.name || "",
            clientMessageId,

            replyTo: replyMessage?._id || null,
replyText:
    replyMessage?.messageType === "voice"
        ? "🎤 Voice message"
    : replyMessage?.messageType === "image"
        ? "🖼 Photo"
    : replyMessage?.messageType === "video"
        ? "🎥 Video"
    : replyMessage?.messageType === "document"
        ? `📄 ${replyMessage.fileName || "Document"}`
    :replyMessage?.messageType === "location"
        ? (
            replyMessage?.isLive
                ? "🌍 Live Location"
                : "📍 Current Location"
          )
    : replyMessage?.message || "",
        replySender: replyMessage?.user || replyMessage?.from || ""
        };

        if (canE2EE && !selectedUser?.isGroup) {
            try { await sendPrivateEncrypted(msg); }
            catch (e) { alert("E2EE send failed: " + (e?.message || e)); return; }
        } else {
            socket.emit("privateMessage", msg);
            setMessages(prev => [
                ...prev,
                {
                    ...msg,
                    from: user.email,
                    createdAt: new Date()
                }
            ]);
        }
        setUploadingMedia(true);
        setUploadProgress(0);
        try {
            await sendAdditionalFiles(queuedFiles.slice(1));
        } finally {
            setUploadingMedia(false);
            setUploadProgress(100);
        }

        socket.emit("stopTyping", {
            to: selectedUser.email
        });

        setStatusMap(prev => ({
            ...prev,
            [clientMessageId]: "sent"
        }));
     
        
        setText("");
        setFile(null);
        setPreview(null);
        setFiles([]);
        setReplyMessage(null);
    };

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files || []);
        if (!selected.length) return;
        const supported = selected.filter((item) =>
            item.type.startsWith("image/") ||
            item.type.startsWith("video/") ||
            item.type.startsWith("audio/") ||
            /\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(item.name)
        );
        if (supported.length !== selected.length) {
            window.alert("Some files are not supported and were removed.");
        }
        const nextFiles = [...files, ...supported].slice(0, 10);
        setFiles(nextFiles);
        setFile(nextFiles[0] || null);
        setPreview(nextFiles[0] ? URL.createObjectURL(nextFiles[0]) : null);
        setShowAttachmentMenu(false);
        e.target.value = "";
    };
    const startRecording = async () => {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        const recorder = new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {

            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }

        };

        recorder.onstop = () => {

    const blob = new Blob(
        audioChunksRef.current,
        {
            type: "audio/webm"
        }
    );

    setVoiceBlob(blob);

    setVoicePreview(
        URL.createObjectURL(blob)
    );

    clearInterval(timerRef.current);

    mediaRecorderRef.current.stream
        .getTracks()
        .forEach(track => track.stop());

};

        recorder.start();

        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);

        timerRef.current = setInterval(() => {

            setRecordingTime(prev => prev + 1);

        }, 1000);

    } catch (err) {

        console.error(err);
        alert("Microphone permission denied.");

    }

};
            const deleteRecording = () => {

                 if (mediaRecorderRef.current) {

              mediaRecorderRef.current.stop();

             mediaRecorderRef.current.stream
                    .getTracks()
                   .forEach(track => track.stop());

            }

                 clearInterval(timerRef.current);

                 audioChunksRef.current = [];

                 setIsRecording(false);
                 setIsPaused(false);
                 setRecordingTime(0);

            };
    const togglePauseRecording = () => {

         if (!mediaRecorderRef.current) return;

             if (isPaused) {

                 mediaRecorderRef.current.resume();

                 timerRef.current = setInterval(() => {
                     setRecordingTime(prev => prev + 1);
                     }, 1000);

                 setIsPaused(false);

                  } else {

                  mediaRecorderRef.current.pause();

                 clearInterval(timerRef.current);

              setIsPaused(true);

                  }

            };

  const stopRecording = () => {

    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {

        const blob = new Blob(audioChunksRef.current, {
            type: "audio/webm"
        });

        setVoiceBlob(blob);

        const preview = URL.createObjectURL(blob);

        setVoicePreview(preview);

        clearInterval(timerRef.current);

        mediaRecorderRef.current.stream
            .getTracks()
            .forEach(track => track.stop());

        await sendVoiceMessage(blob);

    };

    mediaRecorderRef.current.stop();

    setIsRecording(false);

};
const sendVoiceMessage = async (blob) => {

    if (!blob) return;

    const mediaUrl = await new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = reject;

        reader.readAsDataURL(blob);

    });

    const clientMessageId = Date.now().toString();

    const replyData = {
        replyTo: replyMessage?._id || null,

        replyText:
            replyMessage?.messageType === "voice"
                ? "🎤 Voice message"
            : replyMessage?.messageType === "image"
                ? "🖼 Photo"
            : replyMessage?.messageType === "video"
                ? "🎥 Video"
            : replyMessage?.messageType === "document"
                ? `📄 ${replyMessage.fileName || "Document"}`
             : replyMessage?.messageType === "location"
        ? (
            replyMessage?.isLive
                ? "🌍 Live Location"
                : "📍 Location"
          )
            : replyMessage?.message || "",

        replySender: replyMessage?.user || ""
    };

    // ---------------- GROUP ----------------

    if (selectedUser?.isGroup) {

        socket.emit("groupMessage", {
            groupId: selectedUser._id,
            message: "",
            messageType: "voice",
            mediaUrl,
            clientMessageId,
            ...replyData
        });

     

        setStatusMap(prev => ({
            ...prev,
            [clientMessageId]: "sent"
        }));

    }

    // ---------------- PRIVATE ----------------

    else {

        socket.emit("privateMessage", {
            to: selectedUser.email,
            message: "",
            messageType: "voice",
            mediaUrl,
            clientMessageId,
            ...replyData
        });

        setMessages(prev => [
            ...prev,
            {
                from: user.email,
                to: selectedUser.email,
                message: "",
                messageType: "voice",
                mediaUrl,
                clientMessageId,
                createdAt: new Date(),
                status: "sent",
                ...replyData
            }
        ]);

        setStatusMap(prev => ({
            ...prev,
            [clientMessageId]: "sent"
        }));

    }

    setVoiceBlob(null);
    setVoicePreview("");
    setReplyMessage(null);

};
    const handleForwardMessage=(targetUser,message)=>{
        if(!socket) return;
        if(targetUser.isGroup){
           socket.emit("groupMessage", {

    groupId: targetUser._id,

    message: message.message,

    messageType: message.messageType || "text",

    mediaUrl: message.mediaUrl || "",

    fileName: message.fileName || "",

    latitude: message.latitude,

    longitude: message.longitude,

    locationName: message.locationName || "",

    isLive: message.isLive || false,

    liveLocationId: message.liveLocationId || "",

    expiresAt: message.expiresAt || null,

    forwarded: true

});
           showNotification("Forward", "Message forwarded");
            return;
        }

        const clientMessageId=Date.now().toString();
        const forwardMsg = {

    to: targetUser.email,

    message: message.message,

    messageType: message.messageType || "text",

    mediaUrl: message.mediaUrl || "",

    fileName: message.fileName || "",

    latitude: message.latitude,

    longitude: message.longitude,

    locationName: message.locationName || "",

    isLive: message.isLive || false,

    liveLocationId: message.liveLocationId || "",

    expiresAt: message.expiresAt || null,

    clientMessageId,

    replyTo: null,

    replyText: "",

    replySender: "",

    forwarded: true

};
        socket.emit("privateMessage",forwardMsg);
       
        showNotification("Forward", "Message forwarded");
    }
    const handleDeleteForMe = (msg) => {

    if (!socket) return;

    socket.emit("deleteForMe", {
        messageId: msg._id
    });

};

const handleDeleteForEveryone = (msg) => {

    console.log("🔥 handleDeleteForEveryone called");

    if (!socket) {
        console.log("❌ Socket is NULL");
        return;
    }

    console.log("✅ Socket exists");

    console.log(msg);

    socket.emit("deleteForEveryone", {
        messageId: msg._id
    });

    console.log("✅ Event emitted");

};
const handleReaction = (msg, emoji) => {

    if (!socket) return;

    socket.emit("reactMessage", {
        messageId: msg._id,
        emoji
    });

};


        
    return (
        <>
            {isSearchVisible && (
                <div className="chat-search-bar">
                    <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>🔍</span>
                    <input
                        value={searchTextValue}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search in conversation..."
                        autoFocus
                    />
                    <span className="search-count-pill">
                        {matchedIndexesValue.length === 0
                            ? "0 matches"
                            : `${currentMatchValue + 1} of ${matchedIndexesValue.length}`}
                    </span>
                    <button
                        disabled={matchedIndexesValue.length === 0}
                        onClick={() =>
                            setMatchIndex(prev =>
                                prev === 0
                                    ? matchedIndexesValue.length - 1
                                    : prev - 1
                            )
                        }
                        title="Previous match"
                    >
                        ▲
                    </button>
                    <button
                        disabled={matchedIndexesValue.length === 0}
                        onClick={() =>
                            setMatchIndex(prev =>
                                prev === matchedIndexesValue.length - 1
                                    ? 0
                                    : prev + 1
                            )
                        }
                        title="Next match"
                    >
                        ▼
                    </button>
                    <button
                        onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                        }}
                        title="Close search"
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
                        selectedUser={selectedUser}
                      
                        status={statusMap[msg.clientMessageId]||msg.status}
                        onReply={setReplyMessage}
                        onEdit={(message)=>{
                            setEditingMessage(message);
                            setText(message.message);
                                 }}
                        onDeleteForMe={handleDeleteForMe}
                        onDeleteForEveryone={handleDeleteForEveryone}
                         onReact={handleReaction}
                        searchText={searchTextValue}
                        setMessages={setMessages}
                        onForwardMessage={handleForwardMessage}
                        stopLiveLocation={stopLiveLocation}

                    />
                    </div>
                
                ))}
                {aiTyping && (
                    <div style={{ display: "flex", justifyContent: "flex-start", margin: "10px 0" }}>
                        <div style={{ background: "#2f3136", padding: "10px 14px", borderRadius: "10px", color: "#8e9297", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                            <span>🤖 AI is thinking</span>
                            <div className="dot-container">
                                <div className="dot"></div>
                                <div className="dot"></div>
                                <div className="dot"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef}></div>
            </div>

          {preview && file && (
    <div
        style={{
            margin: "10px",
            padding: "10px",
            borderRadius: "12px",
            background: "#2a2f3a",
            display: "inline-block",
            maxWidth: "260px",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.12)"
        }}
    >
        <div style={{ color: "#cbd5e1", fontSize: "12px", marginBottom: "8px" }}>
            {files.length > 1 ? `${files.length} files selected` : file.name}
        </div>
        <button
            onClick={() => {
                setFile(null);
                setPreview(null);
                setFiles([]);
            }}
            style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(0,0,0,0.75)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                zIndex: 10
            }}
            title="Remove attachment"
        >
            ✕
        </button>

        {file.type.startsWith("image") ? (

            <img
                src={preview}
                width="200"
                style={{ borderRadius: "8px", display: "block" }}
                alt="File preview"
            />

        ) : file.type.startsWith("video") ? (

            <video
                src={preview}
                width="200"
                controls
                style={{ borderRadius: "8px", display: "block" }}
            />

        ) : file.type.startsWith("audio") ? (
            <audio src={preview} controls style={{ width: "220px" }} />
        ) : (

            <button
                type="button"
                onClick={() => setDocumentPreview({
                    url: preview,
                    fileName: file.name,
                    fileSize: file.size,
                    type: file.type === "application/pdf" ? "pdf" : "document"
                })}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "white",
                    padding: "10px",
                    border: 0,
                    cursor: "pointer",
                    textAlign: "left"
                }}
            >
                <span style={{ fontSize: "32px" }}>📄</span>

                <div>
                    <div
                        style={{
                            fontWeight: "bold",
                            wordBreak: "break-word",
                            fontSize: "13px"
                        }}
                    >
                        {file.name}
                    </div>

                    <div
                        style={{
                            fontSize: "11px",
                            color: "#8e9297"
                        }}
                    >
                        {formatFileSize(file.size)}
                    </div>
                </div>
            </button>

        )}
        {files.length > 1 && (
            <div style={{ marginTop: "8px", color: "#9ca3af", fontSize: "11px" }}>
                {files.slice(1).map((queuedFile) => (
                    <div key={`${queuedFile.name}-${queuedFile.lastModified}`}>{queuedFile.name}</div>
                ))}
            </div>
        )}

    </div>
)}
            {uploadingMedia && (
                <div style={{ margin: "4px 10px", color: "#93c5fd", fontSize: "12px" }}>
                    Uploading attachments... {uploadProgress}%
                </div>
            )}
            {documentPreview && (
                <MediaModal
                    mediaUrl={documentPreview.url}
                    type={documentPreview.type}
                    fileName={documentPreview.fileName}
                    fileSize={documentPreview.fileSize}
                    onDownload={() => {
                        const link = document.createElement("a");
                        link.href = documentPreview.url;
                        link.download = documentPreview.fileName;
                        link.click();
                    }}
                    onClose={() => setDocumentPreview(null)}
                />
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
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "6px"
    }}
>
    {replyMessage.messageType === "voice" ? (
        <>
            <span>🎤</span>
            <span>Voice message</span>
        </>
    ) : replyMessage.messageType === "image" ? (
        <>
            <span>🖼️</span>
            <span>Photo</span>
        </>
    ) : replyMessage.messageType === "video" ? (
        <>
            <span>🎥</span>
            <span>Video</span>
        </>
    ) : replyMessage.messageType === "document" ? (
        <>
            <span>📄</span>
            <span>{replyMessage.fileName || "Document"}</span>
        </>
    ) : (
        <span>{replyMessage.message}</span>
    )}
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
        {editingMessage && (

            <div
            style={{
                         background: "#2a2a2a",
            borderLeft: "4px solid orange",
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
                    color: "orange",
                    fontWeight: "bold",
                    fontSize: "13px"
                }}
            >
                Editing Message
            </div>

            <div>
                {editingMessage.message}
            </div>
            </div>

            <button
                onClick={(e)=>{
                    e.stopPropagation();

                    setEditingMessage(null);
                    setText("");
                }}
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

            <div className="chat-input-area">
                <div className="input-bar">
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            className="input-action-btn"
                            onClick={() => setShowAttachmentMenu((visible) => !visible)}
                            title="Attachment"
                        >
                            📎
                        </button>
                        {showAttachmentMenu && (
                            <div className="attachment-dropdown">
                                {[
                                    ["🖼️ Photos & Videos", "image/*,video/*"],
                                    ["🎵 Audio Files", "audio/*"],
                                    ["📄 Documents & PDFs", ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"]
                                ].map(([label, accept]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById("mediaInput");
                                            input.accept = accept;
                                            input.click();
                                            setShowAttachmentMenu(false);
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            className="input-action-btn"
                            onClick={() => setShowLocationMenu(prev => !prev)}
                            title="Location"
                        >
                            📍
                        </button>
                        {isSharingLiveLocation && (
                            <button
                                type="button"
                                className="input-action-btn"
                                onClick={stopLiveLocation}
                                title="Stop Live Location"
                                style={{ color: "var(--accent-red)" }}
                            >
                                ⛔
                            </button>
                        )}

                        {showLocationMenu && (
                            <div className="location-dropdown">
                                <button
                                    type="button"
                                    onClick={() => {
                                        sendLocation();
                                        setShowLocationMenu(false);
                                    }}
                                >
                                    📍 Current Location
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLiveLocationModal(true);
                                        setShowLocationMenu(false);
                                    }}
                                >
                                    🌍 Live Location
                                </button>
                            </div>
                        )}
                    </div>

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
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={isBlocked && !selectedUser?.isGroup ? "You have blocked this contact" : "Write a message..."}
                        id="msgInput"
                    />

                    <input
                        id="mediaInput"
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />

                    {isRecording ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                                type="button"
                                className="input-action-btn"
                                onClick={deleteRecording}
                                title="Cancel recording"
                            >
                                🗑
                            </button>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)" }}>
                                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                            </span>
                            <button
                                type="button"
                                className="input-action-btn"
                                onClick={togglePauseRecording}
                                title={isPaused ? "Resume" : "Pause"}
                            >
                                {isPaused ? "▶" : "⏸"}
                            </button>
                            <button
                                type="button"
                                className="send-btn"
                                onClick={stopRecording}
                                title="Send voice note"
                            >
                                ➤
                            </button>
                        </div>
                    ) : (text.trim() || file) ? (
                        <button
                            type="button"
                            className="send-btn"
                            onClick={sendMessage}
                            title="Send message"
                        >
                            ➤
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="input-action-btn"
                            onClick={startRecording}
                            title="Record voice note"
                            style={{ fontSize: "16px" }}
                        >
                            🎤
                        </button>
                    )}
                </div>
            </div>
     {voicePreview && (

    <div
        style={{
            padding: "10px",
            margin: "10px"
        }}
    >
        <audio
            controls
            src={voicePreview}
            style={{
                width: "100%"
            }}
        />
    </div>

)}     
    {showLiveLocationModal && (

    <div
        onClick={() => setShowLiveLocationModal(false)}
        style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999
        }}
    >

        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                width: "350px",
                background: "#202c33",
                borderRadius: "14px",
                color: "white",
                overflow: "hidden"
            }}
        >

            <div
                style={{
                    padding: "18px",
                    fontSize: "18px",
                    fontWeight: "600",
                    borderBottom: "1px solid #333"
                }}
            >
                Share Live Location
            </div>

            <div
                onClick={() => {
                    startLiveLocation(15);
                    setShowLiveLocationModal(false);
                }}
                style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    borderBottom: "1px solid #333"
                }}
            >
                🌍 15 Minutes
            </div>

            <div
                onClick={() => {
                    startLiveLocation(60);
                    setShowLiveLocationModal(false);
                }}
                style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    borderBottom: "1px solid #333"
                }}
            >
                🌍 1 Hour
            </div>

            <div
                onClick={() => {
                    startLiveLocation(480);
                    setShowLiveLocationModal(false);
                }}
                style={{
                    padding: "16px 20px",
                    cursor: "pointer"
                }}
            >
                🌍 8 Hours
            </div>

        </div>

    </div>

)}
     
        </>
    );
}