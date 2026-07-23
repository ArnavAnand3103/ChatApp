import {useEffect,useState,useRef} from "react";
import {fetchGroupInfo,leaveGroup,addMemberToGroup,removeMemberFromGroup,uploadGroupPhoto,fetchUserPublicKeyAPI,rotateGroupKeysAPI} from "../services/api";
import {generateAESGroupKey,encryptGroupKeyForMembers,getOrGenerateUserKeys} from "../utils/crypto";
import {useAuth} from "../context/AuthContext";

export default function GroupInfoModal({
    groupId,
    onClose,
    onlineUsers,
    userStatusMap
}){
    const {token,user}=useAuth();
    const [group,setGroup]=useState(null);
    const [newMember,setNewMember]=useState("");
    const photoInputRef = useRef(null);

    useEffect(()=>{
        if(!groupId) return ;
        fetchGroupInfo(token,groupId).then(data=>{
            console.log("GROUP INFO",data);
            setGroup(data);
        });
    },[groupId,token]);

    const rotateKeysForMembers = async (memberEmails) => {
        try {
            const memberPublicKeysMap = {};
            for (const email of memberEmails) {
                try {
                    const pkRes = await fetchUserPublicKeyAPI(token, email);
                    if (pkRes?.publicKey) {
                        memberPublicKeysMap[email] = pkRes.publicKey;
                    }
                } catch (e) {
                    console.error("Failed to fetch public key for", email, e);
                }
            }
            if (memberEmails.includes(user.email) && !memberPublicKeysMap[user.email]) {
                const userKeys = await getOrGenerateUserKeys(user.email);
                if (userKeys?.publicKey) {
                    memberPublicKeysMap[user.email] = userKeys.publicKey;
                }
            }
            const rawGroupKey = await generateAESGroupKey();
            const groupKeys = await encryptGroupKeyForMembers(rawGroupKey, memberPublicKeysMap);
            await rotateGroupKeysAPI(token, groupId, groupKeys);
        } catch (err) {
            console.error("Failed to rotate group key:", err);
        }
    };

    const handleLeaveGroup=async()=>{
        if(!group) return;
        const currentMemberEmails = (group.members || []).map(m => typeof m === "object" ? m.email : m);
        const remainingMembers = currentMemberEmails.filter(m => m !== user.email);
        if (remainingMembers.length > 0) {
            await rotateKeysForMembers(remainingMembers);
        }
        const data=await leaveGroup(token,groupId);
        alert(data.message);
        if(data.message==="Left group successfully"){
            window.location.reload();
        }
    }
    const handleAddMember=async()=>{
        if(!newMember.trim() || !group) return;
        const data=await addMemberToGroup(
            token,
            groupId,
            newMember
        );
        alert(data.message);
        if(data.group){
            setGroup(data.group);
            const currentMemberEmails = (data.group.members || []).map(m => typeof m === "object" ? m.email : m);
            const allMembers = [...new Set([...currentMemberEmails, newMember])];
            await rotateKeysForMembers(allMembers);
            setNewMember("");
        }
    }
    const handleRemoveMember=async(email)=>{
        if(!window.confirm(`Remove ${email} from this group?`))
            return;
        const data=await removeMemberFromGroup(
            token,
            groupId,
            email
        );
        alert(data.message);
        if(data.group){
            setGroup(data.group);
            const currentMemberEmails = (data.group.members || []).map(m => typeof m === "object" ? m.email : m);
            const remainingMembers = currentMemberEmails.filter(m => m !== email);
            await rotateKeysForMembers(remainingMembers);
        }
    }
    const handleUploadPhoto = (event) => {

    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {

        const photo = reader.result;

        const data = await uploadGroupPhoto(
            token,
            groupId,
            photo
        );

        alert(data.message);

        if (data.photo) {

            setGroup(prev => ({
                ...prev,
                photo: data.photo
            }));
            window.dispatchEvent(
                new Event("groupPhotoUpdated")
            );

        }

    };

    reader.readAsDataURL(file);

};
    if(!group) {
        return (
            <div className="modal-overlay">
                <div className="modal">
                    <h3>Loading Group Info...</h3>
                    <button onClick={onClose}>Close</button>
                </div>
            </div>
        )
    }
    
   return (
    <div
        style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
        }}
    >
        <div
            style={{
                background: "#1f2937",
                color: "white",
                padding: "20px",
                borderRadius: "12px",
                minWidth: "400px"
            }}
        >
           <div
    style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "20px"
    }}
>

    <div
        onClick={() => {
            if (user.email === group.admin) {
                photoInputRef.current?.click();
            }
        }}
        style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#3b82f6",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: user.email === group.admin ? "pointer" : "default",
            marginBottom: "12px",
            fontSize: "36px",
            color: "white",
            fontWeight: "bold"
        }}
    >

        {group.photo ? (

            <img
                src={group.photo}
                alt={group.name}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                }}
            />

        ) : (

            group.name.charAt(0).toUpperCase()

        )}

    </div>

    <h2>{group.name}</h2>

    <p
        style={{
            color: "#888"
        }}
    >
        {group.members.length} Members
    </p>

</div>
           

            <input
    ref={photoInputRef}
    type="file"
    accept="image/*"
    style={{ display: "none" }}
    onChange={handleUploadPhoto}
/>
            <h3>Members</h3>

      {group.members.map(member => (

<div
    key={member.email}
    style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    padding: "12px",
    borderRadius: "12px",
    background: "#273548",
    transition: "0.2s"
}}
>

    {/* Left Side */}
    <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
        }}
    >

        {/* Avatar */}
      <div
    style={{
        width: "45px",
        height: "45px",
        borderRadius: "50%",
        overflow: "hidden",
        background: "#3b82f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontWeight: "bold",
        flexShrink: 0
    }}
>

    {member.photo ? (

        <img
            src={member.photo}
            alt={member.name}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
            }}
        />

    ) : (

        <span>
            {member.name
                ? member.name.charAt(0).toUpperCase()
                : member.email.charAt(0).toUpperCase()}
        </span>

    )}

</div>
        <div>

            <div
                style={{
                    fontWeight: "600"
                }}
            >
                {member.name}

                {member.email === group.admin && (
                    <span
                        style={{
                            color: "#22c55e",
                            marginLeft: "8px",
                            fontSize: "13px"
                        }}
                    >
                        Admin
                    </span>
                )}

            </div>

            <div
                style={{
                    fontSize: "12px",
                    color: "#9ca3af"
                }}
            >
                {onlineUsers.includes(member.email)
                    ? "🟢 Active now"
                    : member.lastSeen
                        ? `⚫ Last seen ${new Date(member.lastSeen).toLocaleString()}`
                        : "⚫ Offline"}
            </div>

        </div>

    </div>

    {/* Remove Button */}
    {user.email === group.admin &&
        member.email !== group.admin && (

        <button
            onClick={() => handleRemoveMember(member.email)}
            style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer"
            }}
        >
            Remove
        </button>

    )}

</div>

))}
            <hr/>
            <h3>Add Member</h3>
            <input
                type="email"
                placeholder="Enter user email"
                value={newMember}
                onChange={(e)=>setNewMember(e.target.value)}
              style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#111827",
            color: "white",
            outline: "none",
            fontSize: "14px"
}}
                />
                <button
                onClick={handleAddMember}
style={{
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
    marginBottom: "15px"
}}           >
                    Add Member
                </button>

            <br />
            <button
            onClick={handleLeaveGroup}
            style={{
                background:"#ef4444",
                color:"white",
                marginRight:"10px",
                padding:"8px 12px",
                border:"none",
                borderRadius:"6px"
            }}
            >
                Leave Group
            </button>
            <button onClick={onClose}>
                Close
            </button>
        </div>
    </div>
);
}