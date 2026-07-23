import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';

import { useAuth } from '../context/AuthContext';

import { createSocket } from '../services/socket';
import { fetchAnalytics, fetchMe, uploadProfilePhoto, updatePublicKeyAPI } from '../services/api';
import { getOrGenerateUserKeys } from '../utils/crypto';

import Chat from '../components/Chat/Chat';
import ChatHeader from '../components/ChatHeader';
import GroupInfoModal from '../components/GroupInfoModal';
import BackupModal from '../components/BackupModal';
import { requestNotificationPermission } from "../utils/notification";
import PhotoViewer from '../components/PhotoViewer';

import { useCall } from "../context/CallContext";
import { registerCallSocket } from "../services/callSocket";
import OutgoingCall from "../components/Call/OutgoingCall";
import IncomingCall from "../components/Call/IncomingCall";

import { getLocalAudioStream, getLocalVideoStream } from "../services/peer";
import CallManager from "../components/Call/CallManager";

import AudioCall from "../components/Call/AudioCall";
import VideoCall from "../components/Call/VideoCall";
import GroupCall from "../components/Call/GroupCall";
import IncomingGroupCall from "../components/Call/IncomingGroupCall";



export default function ChatPage() {

  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [selectedUser, setSelectedUser] = useState(null);


  const [socket, setSocket] = useState(null);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatusMap, setUserStatusMap] = useState({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("chatTheme") || "dark");
  const [myPhoto, setMyPhoto] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [matchedIndexes, setMatchedIndexes] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [showBackup, setShowBackup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [photoViewer, setPhotoViewer] = useState({
    open: false,
    photo: "",
    name: ""
  });
  const {

    incomingCall,
    setIncomingCall,

    outgoingCall,
    setOutgoingCall,

    callStatus,
    setCallStatus,

    localStream,
    setLocalStream,

    remoteStream,
    setRemoteStream,

    setIsCaller,

    muted,
    setMuted,

    callPartner,
    setCallPartner,

    callStartedAt,
    setCallStartedAt,

    isVideoCall,
    setIsVideoCall,

    cameraEnabled,
    setCameraEnabled,

    facingMode,
    setFacingMode,

    isScreenSharing,
    setIsScreenSharing,

    activeGroupCall,
    setActiveGroupCall,
    groupCallStatus,
    setGroupCallStatus,
    groupCallActiveStatusMap,
    setGroupCallActiveStatusMap,
    incomingGroupCall,
    setIncomingGroupCall
  } = useCall();

  const isLight = theme === "light";

  const photoInputRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  localStreamRef.current = localStream;
  const callManagerRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("chatTheme", theme);
  }, [theme]);

  useEffect(() => {
    if (!token || !user?.email) return;
    const syncKeys = async () => {
      try {
        const userKeys = await getOrGenerateUserKeys(user.email);
        if (userKeys?.publicKey) {
          await updatePublicKeyAPI(token, userKeys.publicKey);
        }
      } catch (err) {
        console.error("Failed to sync E2EE public key:", err);
      }
    };
    syncKeys();
  }, [token, user]);

  useEffect(() => {
    if (!token) return;

    fetchMe(token).then((data) => {
      setMyPhoto(data?.user?.photo || "");
    }).catch(() => { });
  }, [token]);
  useEffect(() => {
    console.log("Call Status:", callStatus);
  }, [callStatus]);

  useEffect(() => {
    const channel = new BroadcastChannel("project2-chat-sync");
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const payload = event.data;
      if (!payload) return;

      if (payload.type === "logout") {
        logout();
        navigate("/login");
      }
    };

    return () => channel.close();
  }, [logout, navigate]);


  useEffect(() => {
    if (!token) return;

    const s = createSocket(token);

    setSocket(s);

    registerCallSocket(s, {

      setIncomingCall,
      setOutgoingCall,
      setCallStatus,
      setIsCaller,
      setCallPartner,


      localStreamRef,
      setLocalStream,
      setRemoteStream,
      setGroupCallActiveStatusMap,
      setIncomingGroupCall

      // WebRTC callbacks
      // will be registered inside
      // CallManager later.

    });

    s.on("onlineUsers", (list) => {
      setOnlineUsers(list);

    });

    s.on("userStatus", ({ email, status, lastSeen }) => {
      setUserStatusMap(prev => ({
        ...prev,
        [email]: { status, lastSeen: lastSeen || null }
      }));

      setOnlineUsers(prev => {
        if (status === "online") {
          return [...new Set([...prev, email])];
        }
        return prev.filter(e => e !== email);

      });
    });

    s.on("blockStatus", ({ blocked }) => {
      setIsBlocked(!!blocked);
    });

    requestNotificationPermission();



    return () => {


      s.off("incomingCall");
      s.off("callAccepted");
      s.off("callRejected");
      s.off("callEnded");


      s.disconnect();

    };

  }, [token]);

  useEffect(() => {
    if (!socket || !selectedUser || !user?.email) return;
    if (selectedUser.isGroup) return;
    socket.emit("checkBlock", { me: user.email, other: selectedUser.email });
  }, [socket, selectedUser, user]);

  useEffect(() => {
    if (!socket) return;
    const typingHandler = ({ from }) => {
      if (from === selectedUser?.email) setIsTyping(true);
    };
    const stopTypingHandler = ({ from }) => {
      if (from === selectedUser?.email) setIsTyping(false);
    };
    socket.on("showTyping", typingHandler);
    socket.on("hideTyping", stopTypingHandler);
    return () => {
      socket.off("showTyping", typingHandler);
      socket.off("hideTyping", stopTypingHandler);
    };
  }, [socket, selectedUser]);

  const getStatusText = (friendEmail) => {
    if (!friendEmail) return "Offline";
    const isOnline = onlineUsers.includes(friendEmail);
    if (isOnline) return "Active now";

    const lastSeen = userStatusMap[friendEmail]?.lastSeen || selectedUser?.lastSeen;
    if (!lastSeen) return "Offline";

    const lastSeenDate = new Date(lastSeen);
    const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = lastSeenDate.toLocaleDateString();
    return `Last seen - ${timeStr}, ${dateStr}`;
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const handleOpenPhotoPicker = () => {
    photoInputRef.current?.click();
  };

  const handleUploadPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const photoData = String(reader.result || "");
      const data = await uploadProfilePhoto(token, photoData);
      if (data?.user?.photo) {
        setMyPhoto(data.user.photo);
        alert("Profile photo updated");
      } else {
        alert(data?.message || "Failed to upload profile photo");
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleShowAnalytics = async () => {
    const data = await fetchAnalytics(token);
    if (data?.message) {
      alert(data.message);
      return;
    }

    alert(
      `Users: ${data.totalUsers}
      Messages: ${data.totalMessages}
      Blocks: ${data.totalBlocks}
      My sent: ${data.mySent}
      My received: ${data.myReceived}`
    );
  };

  const handleToggleBlock = () => {
    if (!socket || !selectedUser || !user?.email) return;
    if (selectedUser.isGroup) return;
    socket.emit("toggleBlock", { me: user.email, other: selectedUser.email });
  };

  const handleDeleteHistory = () => {
    if (!socket || !selectedUser || !user?.email) return;
    if (selectedUser.isGroup) return;
    if (window.confirm("Are you sure you want to delete this chat history for both users?")) {
      socket.emit("deleteChat", { me: user.email, withUser: selectedUser.email });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("lastSelectedFriend");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    channelRef.current?.postMessage({ type: "logout" });
    socket?.disconnect();
    logout();
    navigate("/login");
  };

  const startAudioCall = async () => {

    if (!socket || !selectedUser) return;

    if (selectedUser.email === user?.email) {
      alert("You cannot call yourself.");
      return;
    }

    try {

      const stream =
        await getLocalAudioStream();

      setLocalStream(stream);

      socket.emit("callUser", {

        to: selectedUser.email,

        callType: "audio"

      });

      setOutgoingCall({

        to: selectedUser.email,

        toName: selectedUser.name,

        callType: "audio"

      });
      setCallPartner({
        email: selectedUser.email,
        name: selectedUser.name
      });
      setIsCaller(true);

      setCallStatus("calling");

    }

    catch {

      alert("Microphone permission denied.");

    }

  };

  const startVideoCall = async () => {

    if (!socket || !selectedUser) return;

    if (selectedUser.email === user?.email) {
      alert("You cannot call yourself.");
      return;
    }

    try {

      const stream = await getLocalVideoStream();

      setLocalStream(stream);

      setCameraEnabled(true);
      setIsVideoCall(true);

      socket.emit("callUser", {

        to: selectedUser.email,

        callType: "video"

      });

      setOutgoingCall({

        to: selectedUser.email,

        toName: selectedUser.name,

        callType: "video"

      });
      setCallPartner({
        email: selectedUser.email,
        name: selectedUser.name
      });
      setIsCaller(true);

      setCallStatus("calling");

    }

    catch {

      alert("Camera / microphone permission denied.");

    }

  };
  const endOutgoingCall = () => {

    const partnerEmail = callPartner?.email || selectedUser?.email;

    if (!socket || !partnerEmail) return;

    socket.emit("endCall", {

      to: partnerEmail

    });

    localStream?.getTracks().forEach(track => track.stop());

    setIncomingCall(null);

    setOutgoingCall(null);

    setCallStatus("idle");

    setIsCaller(false);

    setCallStartedAt(null);

    setMuted(false);

    setRemoteStream(null);

    setCallPartner(null);

    setLocalStream(null);

    // reset video call state
    setIsVideoCall(false);
    setCameraEnabled(true);
    setIsScreenSharing(false);


  };
  const acceptCall = async () => {

    if (!socket || !incomingCall) return;

    try {

      const isVideo = incomingCall.callType === "video";

      const stream = isVideo
        ? await getLocalVideoStream()
        : await getLocalAudioStream();

      setLocalStream(stream);

      if (isVideo) {
        setIsVideoCall(true);
        setCameraEnabled(true);
      }

      socket.emit("acceptCall", {

        to: incomingCall.from

      });

      setCallPartner({
        email: incomingCall.from,
        name: incomingCall.fromName || incomingCall.from
      });

      setIsCaller(false);

      setCallStatus("connecting");

    }

    catch (err) {

      alert("Microphone / camera permission denied.");

    }

  };
  const rejectCall = () => {

    if (!socket || !incomingCall) return;

    socket.emit("rejectCall", {
      to: incomingCall.from
    });

    setIncomingCall(null);
    setOutgoingCall(null);
    setIsCaller(false);
    setCallPartner(null);

    localStream?.getTracks().forEach(track => track.stop());

    setLocalStream(null);

    setRemoteStream(null);

    setCallStatus("idle");

    // reset video call state
    setIsVideoCall(false);
    setCameraEnabled(true);
    setIsScreenSharing(false);

  };

  // ── Group call incoming handlers ──────────────────────────────────

  const acceptGroupCall = () => {
    if (!incomingGroupCall) return;
    setActiveGroupCall({
      groupId: incomingGroupCall.groupId,
      groupName: incomingGroupCall.groupName,
      callType: incomingGroupCall.callType
    });
    setCallStatus("connected");
    setIncomingGroupCall(null);
  };

  const rejectGroupCall = () => {
    setIncomingGroupCall(null);
  };

  // ── Video call control handlers ──────────────────────────────────────

  const handleToggleCamera = () => {
    callManagerRef.current?.handleToggleCamera(localStream);
  };

  const handleSwitchCamera = () => {
    callManagerRef.current?.handleSwitchCamera(localStream, facingMode, setFacingMode);
  };

  const handleScreenShare = () => {
    callManagerRef.current?.handleScreenShare(localStream, isScreenSharing);
  };


  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div id="toast"></div>
      <Sidebar
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onlineUsers={onlineUsers}
        socket={socket}
        userStatusMap={userStatusMap}
      />

      <div className="chat-main" id="chatArea">
        {!selectedUser && (
          <div className="empty-chat" id="emptyState">
            <h3>Welcome to Project2 Chat</h3>
            <p>Select a friend from the sidebar to start a secure conversation.</p>
          </div>
        )}

        {selectedUser && (
          <div id="activeChat" style={{ display: "flex", height: "100%", flexDirection: "column" }}>
            <ChatHeader
              selectedUser={selectedUser}
              statusText={selectedUser.isGroup ? "Group chat" : getStatusText(selectedUser.email)}
              isTyping={isTyping}
              onAudioCall={startAudioCall}
              onVideoCall={startVideoCall}
              onToggleBlock={handleToggleBlock}
              onDeleteHistory={handleDeleteHistory}
              onLogout={handleLogout}
              onToggleTheme={handleToggleTheme}
              onPhoto={handleOpenPhotoPicker}
              onAnalytics={handleShowAnalytics}
              onToggleSearch={() => setShowSearch(prev => !prev)}
              isBlocked={isBlocked}
              myPhoto={myPhoto}
              onShowGroupInfo={() => setShowGroupInfo(true)}
              onBackup={() => setShowBackup(true)}
              onPhotoClick={() => {
                if (!selectedUser) return;
                const photo = selectedUser.isGroup
                  ? selectedUser.photo
                  : selectedUser.photo;

                if (!photo) return;
                setPhotoViewer({
                  open: true,
                  photo,
                  name: selectedUser.name
                });
              }}

            />

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleUploadPhoto}
            />

            <Chat
              selectedUser={selectedUser}
              socket={socket}
              isBlocked={isBlocked}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
              searchText={searchText}
              setSearchText={setSearchText}
              matchedIndexes={matchedIndexes}
              setMatchedIndexes={setMatchedIndexes}
              currentMatch={currentMatch}
              setCurrentMatch={setCurrentMatch}
              onMessagesChange={setChatMessages}

            />
          </div>
        )}
      </div>

      {showGroupInfo &&
        selectedUser?.isGroup && (
          <GroupInfoModal
            groupId={selectedUser._id}
            onlineUsers={onlineUsers}
            userStatusMap={userStatusMap}
            onClose={() => setShowGroupInfo(false)}
          />
        )}
      {showBackup && (
        <BackupModal
          onClose={() => setShowBackup(false)}
          messages={chatMessages}
          selectedUser={selectedUser}
        />
      )}

      {photoViewer.open && (
        <PhotoViewer
          photo={photoViewer.photo}
          name={photoViewer.name}
          onClose={() =>
            setPhotoViewer({
              open: false,
              photo: "",
              name: ""
            })
          }
        />
      )}
      <IncomingCall
        onAccept={acceptCall}
        onReject={rejectCall}
      />
      <IncomingGroupCall
        onAccept={acceptGroupCall}
        onReject={rejectGroupCall}
      />

      <OutgoingCall
        onEnd={endOutgoingCall}
      />
      <AudioCall
        selectedUser={callPartner}
        onEnd={endOutgoingCall}
      />
      {isVideoCall && (
        <VideoCall
          onEnd={endOutgoingCall}
          onToggleCamera={handleToggleCamera}
          onSwitchCamera={handleSwitchCamera}
          onScreenShare={handleScreenShare}
        />
      )}
      {activeGroupCall && (
        <GroupCall
          socket={socket}
          onLeave={() => setActiveGroupCall(null)}
        />
      )}
      <CallManager
        ref={callManagerRef}
        socket={socket}
        selectedUser={selectedUser}
      />




    </div>
  );
}