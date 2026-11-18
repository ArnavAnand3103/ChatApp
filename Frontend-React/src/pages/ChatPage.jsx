import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';

import { useAuth } from '../context/AuthContext';

import { createSocket } from '../services/socket';
import { deleteProfilePhoto, fetchAnalytics, fetchMe, uploadProfilePhoto } from '../services/api';

import Chat from '../components/Chat/Chat';
import ChatHeader from '../components/ChatHeader';
import GroupInfoModal from '../components/GroupInfoModal';
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
import CallHistoryModal from "../components/CallHistoryModal";
import BackupRestoreModal from "../components/BackupRestoreModal";
import AIAssistantModal from "../components/AIAssistantModal";
import ChatAnalyticsModal from "../components/ChatAnalyticsModal";
import ContactInfoModal from "../components/ContactInfoModal";
import ProfilePhotoUploadModal from "../components/ProfilePhotoUploadModal";

export default function ChatPage() {

  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [selectedUser, setSelectedUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [refreshMessagesSignal, setRefreshMessagesSignal] = useState(0);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showOwnProfile, setShowOwnProfile] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(null);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatusMap, setUserStatusMap] = useState({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("chatTheme") || "light");
  const [myPhoto, setMyPhoto] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [matchedIndexes, setMatchedIndexes] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);
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

    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WebP image");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Profile photos must be smaller than 5 MB");
      event.target.value = "";
      return;
    }

    setPhotoDraft(file);
    event.target.value = "";
  };

  const saveProfilePhoto = async (file, position = "50% 50%") => {
    try {
      const reader = new FileReader();
      const sourceData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const photoData = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const size = Math.min(image.naturalWidth, image.naturalHeight);
          const positionX = Number.parseFloat(position) / 100;
          const sourceX = (image.naturalWidth - size) * positionX;
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Unable to prepare profile photo"));
            return;
          }
          context.drawImage(image, sourceX, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        image.onerror = () => reject(new Error("Unable to read profile photo"));
        image.src = sourceData;
      });
      const data = await uploadProfilePhoto(token, photoData);
      if (data?.user?.photo) {
        setMyPhoto(data.user.photo);
        setPhotoDraft(null);
        alert("Profile photo updated");
      } else {
        alert(data?.message || "Failed to upload profile photo");
      }
    } catch (error) {
      alert(`Failed to upload profile photo: ${error.message}`);
    }
  };

  const handleRemovePhoto = async () => {
      if (!window.confirm("Remove your profile photo?")) return;
      try {
        const data = await deleteProfilePhoto(token);
        if (data?.user) {
          setMyPhoto("");
          alert("Profile photo removed");
        } else {
          alert(data?.message || "Failed to remove profile photo");
        }
      } catch (error) {
        alert(`Failed to remove profile photo: ${error.message}`);
      }
  };

  const handleShowAnalytics = () => {
    setShowAnalytics(true);
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
    <div className="chat-page-container">
      <div id="toast"></div>
      <div className={`chat-card-frame ${selectedUser ? 'has-active-chat' : 'no-active-chat'}`}>
        <Sidebar
          onOpenProfile={() => setShowOwnProfile(true)}
          profilePhoto={myPhoto}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          onlineUsers={onlineUsers}
          socket={socket}
          userStatusMap={userStatusMap}
          onCallHistory={() => setShowCallHistory(true)}
          onBackupRestore={() => setShowBackupRestore(true)}
          onOpenAI={() => setShowAIAssistant(true)}
          onAnalytics={handleShowAnalytics}
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
              onBack={() => setSelectedUser(null)}
              onAudioCall={startAudioCall}
              onVideoCall={startVideoCall}
              onToggleBlock={handleToggleBlock}
              onDeleteHistory={handleDeleteHistory}
              onLogout={handleLogout}
              onToggleTheme={handleToggleTheme}
              onPhoto={handleOpenPhotoPicker}
              onAnalytics={handleShowAnalytics}
              onCallHistory={() => setShowCallHistory(true)}
              onBackupRestore={() => setShowBackupRestore(true)}
              onOpenAI={() => setShowAIAssistant(true)}
              onContactInfo={() => setShowContactInfo(true)}
              onRemovePhoto={handleRemovePhoto}
              onToggleSearch={() => setShowSearch(prev => !prev)}
              isBlocked={isBlocked}
              myPhoto={myPhoto}
              onShowGroupInfo={() => setShowGroupInfo(true)}
              onPhotoClick={() => {
                if (!selectedUser) return;
                const photo = selectedUser.isGroup
                  ? selectedUser.photo
                  : selectedUser.photo;

                if (!photo) {
                  if (selectedUser.isGroup) {
                    setShowGroupInfo(true);
                  } else if (selectedUser.email !== "ai@chatapp.com") {
                    setShowContactInfo(true);
                  }
                  return;
                }
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
              key={`${selectedUser.isGroup ? selectedUser._id : selectedUser.email}-${refreshMessagesSignal}`}
              selectedUser={selectedUser}
              socket={socket}
              isBlocked={isBlocked}
              refreshMessagesSignal={refreshMessagesSignal}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
              searchText={searchText}
              setSearchText={setSearchText}
              matchedIndexes={matchedIndexes}
              setMatchedIndexes={setMatchedIndexes}
              currentMatch={currentMatch}
              setCurrentMatch={setCurrentMatch}

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
            onGroupLeft={() => {
              setShowGroupInfo(false);
              setSelectedUser(null);
            }}
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
      {showCallHistory && (
        <CallHistoryModal
          selectedUser={selectedUser}
          onClose={() => setShowCallHistory(false)}
        />
      )}
      {showContactInfo && selectedUser && !selectedUser.isGroup && (
        <ContactInfoModal
          contact={selectedUser}
          isOnline={onlineUsers.includes(selectedUser.email)}
          lastSeenText={getStatusText(selectedUser.email)}
          isBlocked={isBlocked}
          onBlockedChange={setIsBlocked}
          onMessage={() => setShowContactInfo(false)}
          onSearch={() => {
            setShowContactInfo(false);
            setShowSearch(true);
          }}
          onOpenPhotoViewer={(photo, name) => setPhotoViewer({ open: true, photo, name })}
          onClose={() => setShowContactInfo(false)}
        />
      )}
      {showOwnProfile && (
        <ContactInfoModal
          contact={{ ...user, photo: myPhoto }}
          isOnline={true}
          lastSeenText="Active now"
          isBlocked={false}
          canEditAbout
          onMessage={() => setShowOwnProfile(false)}
          onSearch={() => setShowOwnProfile(false)}
          onClose={() => setShowOwnProfile(false)}
        />
      )}
      {photoDraft && (
        <ProfilePhotoUploadModal
          file={photoDraft}
          onSave={saveProfilePhoto}
          onCancel={() => setPhotoDraft(null)}
        />
      )}
      {showBackupRestore && (
        <BackupRestoreModal
          selectedUser={selectedUser}
          onRestoreComplete={() => {
            setRefreshMessagesSignal((signal) => signal + 1);
          }}
          onClose={() => setShowBackupRestore(false)}
        />
      )}
      <AIAssistantModal
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        selectedUser={selectedUser}
        socket={socket}
      />
      <ChatAnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
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
    </div>
  );
}