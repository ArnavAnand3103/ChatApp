import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';

import {useAuth} from '../context/AuthContext';

import {createSocket} from '../services/socket';
import {fetchAnalytics,fetchMe,uploadProfilePhoto} from '../services/api';

import Chat from '../components/Chat/Chat';
import ChatHeader from '../components/ChatHeader';
import GroupInfoModal from '../components/GroupInfoModal';
import { requestNotificationPermission } from "../utils/notification";
import PhotoViewer from '../components/PhotoViewer';


export default function ChatPage(){

  const navigate=useNavigate();
  const {user,token,logout}=useAuth();

    const [selectedUser,setSelectedUser]=useState(null);

    const [socket,setSocket]=useState(null);

    const [onlineUsers,setOnlineUsers]=useState([]);
  const [userStatusMap,setUserStatusMap]=useState({});
  const [isBlocked,setIsBlocked]=useState(false);
  const [theme,setTheme]=useState(localStorage.getItem("chatTheme")||"dark");
  const [myPhoto,setMyPhoto]=useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupInfo,setShowGroupInfo]=useState(false);
  const [photoViewer,setPhotoViewer]=useState({
    open:false,
    photo:"",
    name:""
});

  const isLight=theme==="light";

  const photoInputRef=useRef(null);
  const channelRef=useRef(null);

  useEffect(()=>{
    document.body.setAttribute("data-theme",theme);
    localStorage.setItem("chatTheme",theme);
  },[theme]);

  useEffect(()=>{
    if(!token) return;

    fetchMe(token).then((data)=>{
      setMyPhoto(data?.user?.photo||"");
    }).catch(()=>{});
  },[token]);

  useEffect(()=>{
    const channel=new BroadcastChannel("project2-chat-sync");
    channelRef.current=channel;

    channel.onmessage=(event)=>{
      const payload=event.data;
      if(!payload) return;

      if(payload.type==="logout"){
        logout();
        navigate("/login");
      }
    };

    return ()=>channel.close();
  },[logout,navigate]);


    useEffect(()=>{
    if(!token) return;

        const s=createSocket(token);

        setSocket(s);

        s.on("onlineUsers",(list)=>{
            setOnlineUsers(list);

        });

    s.on("userStatus",({email,status,lastSeen})=>{
      setUserStatusMap(prev=>({
        ...prev,
        [email]:{status,lastSeen:lastSeen||null}
      }));

            setOnlineUsers(prev=>{
                if(status==="online"){
                    return [...new Set([...prev,email])];
                }
                return prev.filter(e=>e!==email);

            });
        });

          s.on("blockStatus",({blocked})=>{
            setIsBlocked(!!blocked);
          });

         requestNotificationPermission();

        return()=>s.disconnect();

    },[token]);

        useEffect(()=>{
          if(!socket||!selectedUser||!user?.email) return;
          if(selectedUser.isGroup) return;
          socket.emit("checkBlock",{me:user.email,other:selectedUser.email});
        },[socket,selectedUser,user]);

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

        const getStatusText=(friendEmail)=>{
          if(!friendEmail) return "Offline";
          const isOnline=onlineUsers.includes(friendEmail);
          if(isOnline) return "Active now";

          const lastSeen=userStatusMap[friendEmail]?.lastSeen||selectedUser?.lastSeen;
          if(!lastSeen) return "Offline";

          const lastSeenDate=new Date(lastSeen);
          const timeStr=lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr=lastSeenDate.toLocaleDateString();
          return `Last seen - ${timeStr}, ${dateStr}`;
        };

        const handleToggleTheme=()=>{
          setTheme(prev=>prev==="light"?"dark":"light");
        };

        const handleOpenPhotoPicker=()=>{
          photoInputRef.current?.click();
        };

        const handleUploadPhoto=(event)=>{
          const file=event.target.files?.[0];
          if(!file) return;

          if(!file.type.startsWith("image/")){
            alert("Please select an image file");
            event.target.value="";
            return;
          }

          const reader=new FileReader();
          reader.onload=async()=>{
            const photoData=String(reader.result||"");
            const data=await uploadProfilePhoto(token,photoData);
            if(data?.user?.photo){
              setMyPhoto(data.user.photo);
              alert("Profile photo updated");
            }else{
              alert(data?.message||"Failed to upload profile photo");
            }
            event.target.value="";
          };
          reader.readAsDataURL(file);
        };

        const handleShowAnalytics=async()=>{
          const data=await fetchAnalytics(token);
          if(data?.message){
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

        const handleToggleBlock=()=>{
          if(!socket||!selectedUser||!user?.email) return;
          if(selectedUser.isGroup) return;
          socket.emit("toggleBlock",{me:user.email,other:selectedUser.email});
        };

        const handleDeleteHistory=()=>{
          if(!socket||!selectedUser||!user?.email) return;
          if(selectedUser.isGroup) return;
          if(window.confirm("Are you sure you want to delete this chat history for both users?")){
            socket.emit("deleteChat",{me:user.email,withUser:selectedUser.email});
          }
        };

        const handleLogout=()=>{
          sessionStorage.removeItem("lastSelectedFriend");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          channelRef.current?.postMessage({type:"logout"});
          socket?.disconnect();
          logout();
          navigate("/login");
        };

        return(
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
                            onToggleBlock={handleToggleBlock}
                            onDeleteHistory={handleDeleteHistory}
                            onLogout={handleLogout}
                            onToggleTheme={handleToggleTheme}
                            onPhoto={handleOpenPhotoPicker}
                            onAnalytics={handleShowAnalytics}
                            onToggleSearch={() => setShowSearch(prev => !prev)}
                            isBlocked={isBlocked}
                            myPhoto={myPhoto}
                            onShowGroupInfo={()=>setShowGroupInfo(true)}
                            onPhotoClick={()=>{
                              if(!selectedUser) return;
                              const photo=selectedUser.isGroup
                              ?selectedUser.photo
                              :selectedUser.photo;

                              if(!photo) return;
                              setPhotoViewer({
                                open:true,
                                photo,
                                name:selectedUser.name
                              });
                            }}
                        />

                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            style={{display:"none"}}
                            onChange={handleUploadPhoto}
                        />

                        <Chat 
                            selectedUser={selectedUser}
                            socket={socket}
                            isBlocked={isBlocked}
                            
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
             {photoViewer.open&&(
              <PhotoViewer
              photo={photoViewer.photo}
              name={photoViewer.name}
              onClose={()=>
                setPhotoViewer({
                  open:false,
                  photo:"",
                  name:""
                })
              }
              />
             )}
          </div>
        );
}