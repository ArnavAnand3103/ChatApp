import {useEffect,useState} from 'react';



import {useAuth} from '../../context/AuthContext';
import {
    fetchUsers,
    getGroups,
    createGroup,
    archiveChat,
    unarchiveChat,
    getArchivedChats
} from "../../services/api";


export default function Sidebar({onSelectUser,selectedUser,onlineUsers = [],socket,userStatusMap = {}}){
    const {token,user}=useAuth();

    const [users,setUsers]=useState([]);

    const [search,setSearch]=useState("");
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [groups,setGroups]=useState([]);
    const [archivedChats,setArchivedChats]=useState([]);
    const [showArchived,setShowArchived]=useState(false);
    const [groupUnreadCounts,setGroupUnreadCounts]=useState({});
    const [toast,setToast]=useState(null);
    const [showModal,setShowModal]=useState(false);
    const [notification,setNotification]=useState("");
    const [groupName,setGroupName]=useState("");
    const [selectedMembers,setSelectedMembers]=useState([]);
    const [menuOpen, setMenuOpen] = useState(null);
    
    const archivedUsers = users.filter(user =>
    archivedChats.some(chat =>
        chat.chatId === user.email &&
        chat.chatType === "private"
    )
);

const archivedGroups = groups.filter(group =>
    archivedChats.some(chat =>
        chat.chatId === group._id &&
        chat.chatType === "group"
    )
);

    useEffect(()=>{
        const loadUsers=async()=>{
            const data=await fetchUsers(token,search);

            setUsers(data);

            // Initialize from API
            const counts = {};
            const lasts = {};
            data.forEach(u => {
                counts[u.email] = u.unreadCount || 0;
                lasts[u.email] = u.lastMessage || null;
            });
            setUnreadCounts(prev => ({...prev, ...counts}));
            setLastMessages(prev => ({...prev, ...lasts}));

            if(!search&&data.length>0){
                const filtered=data.filter((u)=>u.email!==user.email);
                const lastSelectedRaw=sessionStorage.getItem("lastSelectedFriend");
                if(lastSelectedRaw){
                    try{
                        const lastSelected=JSON.parse(lastSelectedRaw);
                        const found=filtered.find((u)=>u.email===lastSelected.email);
                        if(found&&!selectedUser){
                            onSelectUser(found);
                            return;
                        }
                    }catch{}
                }
                if(filtered.length>0&&!selectedUser){
                    onSelectUser(filtered[0]);
                }
            }
        };
        loadUsers();
    },[search,token]);

    useEffect(()=>{
        if(!socket) return;
        const handler=(msg)=>{
            const from = msg.fromEmail || msg.from;
            const to = msg.toEmail || msg.to;
            const isMe = from === user.email;
            const otherUser = isMe ? to : from;

            // Update Last Message Preview
            setLastMessages(prev => ({
                ...prev,
                [otherUser]: msg
            }));
            setUsers(prev=>{
                const updated=[...prev];
                const index=updated.findIndex(
                    u=>u.email===otherUser
                );
                if(index>-1){
                    const [chat]=updated.splice(index,1);
                    updated.unshift(chat);
                }
                return updated;
            })

            // Increment Unread if not current chat and not from me
            if(!isMe && otherUser !== selectedUser?.email){
                setUnreadCounts(prev=>({
                    ...prev,
                    [otherUser]:(prev[otherUser]||0)+1
                }));
            }
        };
        socket.on("receiveMessage",handler);

        return ()=>socket.off("receiveMessage",handler);
    },[socket,selectedUser,user.email]);

 useEffect(() => {

    if (!token) return;


    getGroups(token).then(setGroups);

    getArchivedChats(token).then(setArchivedChats);
        const refreshGroups=async()=>{
        const data=await getGroups(token);
        setGroups(data);
    };
    window.addEventListener(
        "groupPhotoUpdated",
        refreshGroups
    );
    return()=>{
        window.removeEventListener(
            "groupPhotoUpdated",
            refreshGroups
        );
    }

}, [token]);
    useEffect(()=>{
            if(!socket) return;
            const handler=({group})=>{
                    console.log("ADDED TO GROUP EVENT RECEIVED", group);
               
    setNotification(`You were added to group "${group.name}"`);

    setTimeout(() => {
        setNotification("");
    }, 5000);
                setGroups(prev=>{
                    const exists=prev.some(
                        g=>g._id===group._id
                    );
                    if(exists) return prev;
                    return [...prev,group];
                });
            };
            socket.on("addedToGroup",handler);
        return ()=>{
            socket.off("addedToGroup",handler);
        }
        },[socket]);
useEffect(()=>{
    if(!socket) return;
    const handler=({groupName,member})=>{
        setNotification(
            `${member} left group "${groupName}"`
        );
        setTimeout(()=>{
            setNotification("");
        },5000);
    };
    socket.on("groupMemberLeft",handler);
    return ()=>{
        socket.off("groupMemberLeft",handler);
    }
},[socket]);
useEffect(() => {

    if (!socket) return;

    const profilePhotoHandler = ({ email, photo }) => {

        setUsers(prev =>
            prev.map(u =>
                u.email === email
                    ? { ...u, photo }
                    : u
            )
        );

    };

    socket.on("profilePhotoUpdated", profilePhotoHandler);

    return () => {
        socket.off("profilePhotoUpdated", profilePhotoHandler);
    };

}, [socket]);
useEffect(()=>{
    if(!socket) return;
    const handler=({groupId,groupName})=>{
        setNotification(`You were removed from "${groupName}"`);
        setGroups(prev=>
            prev.filter(g=>String(g._id)!==String(groupId))
        );
        setTimeout(()=>{
            setNotification("");
        },5000);
        //If this group chat is currently open,close it.
        if(selectedUser?._id===groupId){
            onSelectUser(null);
        }
    };
    socket.on("removeFromGroup",handler);
    return ()=>{
        socket.off("removeFromGroup",handler);
    }
},[socket,selectedUser,onSelectUser]);

useEffect(()=>{
    if(!socket) return ;
    const handler=(msg)=>{
            console.log("GROUP TOAST EVENT", msg);
        if(selectedUser?._id!==msg.groupId){
            setGroupUnreadCounts(prev=>({
                ...prev,
                [msg.groupId]:(prev[msg.groupId]||0)+1
            }));
            setGroups(prev=>{
                const updated=[...prev];
                const index=updated.findIndex(
                    g=>String(g._id)===String(msg.groupId)
                );
                if(index>-1){
                    const [group]=updated.splice(index,1);
                    updated.unshift(group);
                }
                return updated;
            })
            setToast({
               groupName:
               groups.find(
                g=>String(g._id)===String(msg.groupId)

               )?.name||"Group",
               text:msg.message
            });
            setTimeout(()=>{
                setToast(null);
            },4000);
        }
    };
    socket.on("receiveGroupMessage",handler);
    return()=>{
        socket.off("receiveGroupMessage",handler);
    };

},[socket,selectedUser]);
        
    return (
        <>
        {notification && (
            <div
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    background: "#22c55e",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    zIndex: 9999,
                    fontWeight: "bold"
                }}
            >
                {notification}
            </div>
        )}

        {
toast && (
<div className="group-toast">
    New Message in {toast.groupName}:{toast.text}
    
</div>
)
}
        
    
            <div className="sidebar">

                <div className="sidebar-header">
                    <h2>Chats</h2>
                    <div className="search-container">
                        <input
                        placeholder="Search friends..."
                        value={search}
                        onChange={(e)=>setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <button
                onClick={()=>setShowModal(true)}
                style={{marginBottom:"10px"}}
                >
                  ➕ Create Group  
                </button>

                <div className="friend-list">

                {users
                .filter(u =>
    u.email !== user.email &&
    !archivedChats.some(
        a =>
            a.chatId === u.email &&
            a.chatType === "private"
    )
)
                .map((u)=>{
                    const isOnline=onlineUsers.includes(u.email);
                    const fallbackLastSeen=u.lastSeen;
                    const lastSeen=userStatusMap[u.email]?.lastSeen||fallbackLastSeen;
                    let statusText=isOnline?"Active now":"Offline";
                    if(!isOnline&&lastSeen){
                        const lastSeenDate=new Date(lastSeen);
                        const timeStr=lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr=lastSeenDate.toLocaleDateString();
                        statusText=`${timeStr}, ${dateStr}`;
                    }
                    
                    const initials = String(u.name || "?").substring(0,2).toUpperCase();
                    console.log(u);

                    return (
                        <div
                        key={u.email}
                        style={{
                            position:"relative"
                        }}
                        onClick={()=>{
                            onSelectUser(u);
                            sessionStorage.setItem("lastSelectedFriend",JSON.stringify(u));
                            setUnreadCounts(prev=>({
                                ...prev,
                                [u.email]:0
                            }));
                        }}
                        className={`friend ${selectedUser?.email===u.email ? 'active' : ''}`}
                        >
                            <div className="avatar-container">
                              <div className="avatar">

    {u.photo ? (

        <img
            src={u.photo}
            alt={u.name}
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover"
            }}
        />

    ) : (

        initials

    )}

</div>
                                <div className={`status-dot ${isOnline ? 'online' : ''}`}></div>
                            </div>

                            <div className="friend-info">
                                <div className="friend-name">{u.name}</div>
                                <div className="friend-last-msg">
                                    {lastMessages[u.email] ? (
                                        lastMessages[u.email].messageType === "media" 
                                            ? "📷 Photo/Video" 
                                            : lastMessages[u.email].message
                                    ) : statusText}
                                </div>
                            </div>
                            <button
                            onClick={(e) => {
                                 e.stopPropagation();

                                    setMenuOpen(
                                     menuOpen === u.email
                                         ? null
                                        : u.email
                                        );
                                        }}
                                         style={{
                                 background: "transparent",
                                     border: "none",
                                      color: "white",
                                      cursor: "pointer",
                                     fontSize: "20px",
                                      marginLeft: "auto"
                                             }}
                                            >
                                          ⋮
                                    </button>

                                    {menuOpen === u.email && (

                                            <div
                                         style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "45px",
                                        background: "#222",
                                        borderRadius: "8px",
                                         padding: "8px",
                                        display: "flex",
                                        flexDirection: "column",
                                         zIndex: 100
                                         }}
                                            >

                                    <button
                                onClick={async(e)=>{

                                e.stopPropagation();

                                const data=await archiveChat(
                                token,
                                u.email,
                                "private"
                                );

                                alert(data.message);

                                 setMenuOpen(null);
                                  if (
            data.message === "Archived successfully" ||
            data.message === "Already archived"
        ) {

            // Add immediately to Archived section
            setArchivedChats(prev => [
                ...prev,
                {
                    chatId: u.email,
                    chatType: "private"
                }
            ]);

            // Remove immediately from chat list
         
        }

                                }}
                                >
                            Archive Chat
                            </button>

                            <button>
                            Delete Chat
                            </button>

                            <button>
                            Block User
                            </button>

                                </div>

                            )}
                                  
                            {unreadCounts[u.email] > 0 && (
                                <div className="unread-badge">
                                    {unreadCounts[u.email]}
                                </div>
                            )}
                        </div>
                    );
                })
                }
                </div>
                <hr />

<h3
    onClick={() => setShowArchived(!showArchived)}
    style={{
        cursor: "pointer",
        userSelect: "none"
    }}
>
    📁 Archived ({archivedChats.length})
</h3>
{showArchived &&
        archivedUsers.map(u => (

        <div
      key={u.email}
    className="friend"
    onClick={() => {

       onSelectUser(u);

                setUnreadCounts(prev => ({
                    ...prev,
                    [u.email]: 0
                }));

    }}
>

        <div className="avatar-container">

            <div className="avatar">
             {u.photo ? (

        <img
            src={u.photo}
            alt={u.name}
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover"
            }}
        />

    ) : (

        (u.name || "?")
            .substring(0,2)
            .toUpperCase()

    )}
                </div>

                <div
                className={`status-dot ${
                onlineUsers.includes(u.email)
                    ?"online"
                    :""
                }`}
                    ></div>

                    </div>

                    <div className="friend-info">

            <div
                style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
                    }}
                    >

                    <div className="friend-name">
                 {u.name}
                    </div>

                    <div
                    style={{
                    fontSize: "12px",
                        color: "#999"
                         }}
                        >
                    {
                 lastMessages[u.email]
                 ? new Date(
                     lastMessages[u.email].createdAt
                    ).toLocaleTimeString([], {
                       hour: "2-digit",
                       minute: "2-digit"
                     })
                    : ""
                    }
</div>

</div>

<div className="friend-last-msg">
   {
    lastMessages[u.email]
        ? (
            lastMessages[u.email].messageType === "media"
                ? "📷 Photo/Video"
                : lastMessages[u.email].message
        )
        : "No messages"
}
</div>

</div>
<div
    style={{
        marginLeft:"auto",
        position:"relative"
    }}
    >
        <button 
        onClick={(e)=>{
            e.stopPropagation();

            setMenuOpen(
                menuOpen===`archive-${u.email}`
                ?null
                :`archive-${u.email}`
            );

        }}
           style={{
        background: "transparent",
        border: "none",
        color: "white",
        cursor: "pointer",
        fontSize: "20px"
    }}
    >
           ⋮
    </button>

{menuOpen === `archive-${u.email}` && (

<div
    style={{
        position: "absolute",
        right: 0,
        top: "35px",
        background: "#222",
        borderRadius: "8px",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000
    }}
>

    <button
onClick={async (e) => {
    e.stopPropagation();

    const data = await unarchiveChat(
        token,
        u.email
    );

    alert(data.message);

    if (data.message === "Chat restored") {

        setArchivedChats(prev =>
            prev.filter(chat =>
                chat.chatId !== u.email
            )
        );

    }

    setMenuOpen(null);
    }}
>
    Unarchive
</button>

<button>
    Delete Chat
</button>

<button>
    Block User
</button>

</div>

)}

</div>
{unreadCounts[u.email]>0&&(
    <div className="unread-badge">
        {unreadCounts[u.email]}
        </div>
)}


</div>

))
}
<h4 style={{ marginTop: "10px" }}>Groups</h4>

{archivedGroups.map(g => (

<div
    key={g._id}
    className="friend"
    onClick={() => {

        onSelectUser({
            ...g,
            isGroup: true
        });

    }}
>

    <div className="avatar-container">
       <div className="avatar">
    {g.photo ? (
        <img
            src={g.photo}
            alt={g.name}
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover"
            }}
        />
    ) : (
        "👥"
    )}
</div>
    </div>

    <div className="friend-info">

        <div className="friend-name">
            {g.name}
        </div>

        <div className="friend-last-msg">
            Group Chat
        </div>

    </div>

</div>

))}
                <h3>Groups</h3>

    {
    groups.filter(group=>
        !archivedChats.some(
            a=>a.chatId===group._id&&
            a.chatType==="group" 
               )
    ).map(g => {

        // create initials for group avatar
        const initials = String(g.name || "?").substring(0,2).toUpperCase();

        return (
           <div
    key={g._id}
    onClick={() => {
        onSelectUser({
            ...g,
            isGroup: true
        });

        setGroupUnreadCounts(prev => ({
            ...prev,
            [g._id]: 0
        }));
    }}
    className={`friend ${selectedUser?._id === g._id ? "active" : ""}`}
>

    {/* Avatar */}
    <div className="avatar-container">
        <div className="avatar">

    {g.photo ? (

        <img
            src={g.photo}
            alt={g.name}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%"
            }}
        />

    ) : (

        "👥"

    )}

</div>
    </div>

    {/* Group info */}
    <div className="friend-info">
        <div className="friend-name">
            {g.name}
        </div>

        <div className="friend-last-msg">
            Group chat
        </div>
    </div>

    {/* Three-dot menu */}
    <div
        style={{
            marginLeft: "auto",
            position: "relative"
        }}
    >

        <button
            onClick={(e) => {
                e.stopPropagation();

                setMenuOpen(
                    menuOpen === `group-${g._id}`
                        ? null
                        : `group-${g._id}`
                );
            }}
            style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "20px"
            }}
        >
            ⋮
        </button>

        {menuOpen === `group-${g._id}` && (

            <div
                style={{
                    position: "absolute",
                    right: 0,
                    top: "35px",
                    background: "#222",
                    borderRadius: "8px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1000
                }}
            >

                <button
                    onClick={async (e) => {

                        e.stopPropagation();

                        const data = await archiveChat(
                            token,
                            g._id,
                            "group"
                        );

                        alert(data.message);

                        if (
                            data.message === "Archived successfully" ||
                            data.message === "Already archived"
                        ) {
                            setArchivedChats(prev => [
                                ...prev,
                                {
                                    chatId: g._id,
                                    chatType: "group"
                                }
                            ]);
                        }

                        setMenuOpen(null);

                    }}
                >
                    Archive Group
                </button>

            </div>

        )}

    </div>

    {/* Unread badge */}
    {groupUnreadCounts[g._id] > 0 && (
        <div className="unread-badge">
            {groupUnreadCounts[g._id]}
        </div>
    )}

</div>        );
    })}
            </div>
            {showModal && (
                <div 
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000
                }}
                >
                    <div style={{
                        background: "var(--sidebar-bg)",
                        backdropFilter: "blur(15px)",
                        padding: "24px",
                        borderRadius: "12px",
                        width: "360px",
                        color: "var(--text-color)",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                        <h3 style={{ marginBottom: "15px" }}>Create New Group</h3>
                        <input 
                            placeholder="Group Name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                marginBottom: "15px",
                                borderRadius: "6px",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                background: "rgba(255, 255, 255, 0.05)",
                                color: "var(--text-color)",
                                outline: "none"
                            }}
                        />
                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ fontSize: "14px", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Select Members:</label>
                            <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "10px", borderRadius: "6px" }}>
                                {users
                                .filter(u => u.email !== user.email)
                                .map(u => (
                                    <div key={u.email} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                                        <input 
                                            type="checkbox"
                                            checked={selectedMembers.includes(u.email)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedMembers(prev => [...prev, u.email]);
                                                } else {
                                                    setSelectedMembers(prev => prev.filter(m => m !== u.email));
                                                }
                                            }}
                                            style={{ marginRight: "10px" }}
                                        />
                                        <span style={{ fontSize: "14px" }}>{u.name || u.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button 
                                onClick={() => {
                                    setShowModal(false);
                                    setGroupName("");
                                    setSelectedMembers([]);
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "rgba(255, 255, 255, 0.1)",
                                    color: "var(--text-color)",
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if (!groupName.trim()) {
                                        alert("Please enter a group name");
                                        return;
                                    }
                                    const res = await createGroup(token, { name: groupName, members: selectedMembers });
                                    if (res.group) {
                                        setGroups(prev => [...prev, res.group]);
                                        setShowModal(false);
                                        setGroupName("");
                                        setSelectedMembers([]);
                                    } else {
                                        alert(res.message || "Failed to create group");
                                    }
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "var(--accent-blue)",
                                    color: "white",
                                    cursor: "pointer"
                                }}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}