const API_BASE="http://localhost:5001";

const authHeaders=(token,withJson=true)=>({
    ...(withJson?{"Content-Type":"application/json"}:{}),
    "Authorization":`Bearer ${token}`
});

export const fetchUsers=async(token,query="")=>{
    const res=await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`,{
        headers:authHeaders(token,false)
    });
    return res.json();
};

export const fetchMessages=async(token,targetEmail)=>{
    const res=await fetch(`${API_BASE}/messages?with=${encodeURIComponent(targetEmail)}`,{
        headers:authHeaders(token,false)
    });
    return res.json();
};

export const loginRequest=async(email,password)=>{
    const res=await fetch(`${API_BASE}/login`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password})
    });
    return res.json();
};

export const signupRequest=async(name,email,password)=>{
    const res=await fetch(`${API_BASE}/signup`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,email,password})
    });
    return res.json();
};

export const forgotPasswordRequest=async(email)=>{
    const res=await fetch(`${API_BASE}/forgot-password`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email})
    });
    return res.json();
};

export const resetPasswordRequest=async(token,newPassword)=>{
    const res=await fetch(`${API_BASE}/reset-password`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,newPassword})
    });
    return res.json();
};

export const uploadProfilePhoto=async(token,photoData)=>{
    const res=await fetch(`${API_BASE}/profile/photo`,{
        method:"POST",
        headers:authHeaders(token),
        body:JSON.stringify({photoData})
    });
    return res.json();
};

export const fetchAnalytics=async(token)=>{
    const res=await fetch(`${API_BASE}/analytics`,{
        headers:authHeaders(token,false)
    });
    return res.json();
};

export const fetchMe=async(token)=>{
    const res=await fetch(`${API_BASE}/me`,{
        headers:authHeaders(token,false)
    });
    return res.json();
};
export const createGroup=async(token,data)=>{
    const res=await fetch("http://localhost:5001/create-group",{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`
        },
        body:JSON.stringify(data)
    });
    return res.json();
}

export const getGroups=async(token)=>{
    const res=await fetch("http://localhost:5001/groups",{
        headers:{
            "Authorization":`Bearer ${token}`
        }
    });
    return res.json();
}
export const fetchGroupInfo=async(token,groupId)=>{
    const res=await fetch(
        `http://localhost:5001/group/${groupId}`,{
            headers:{
                "Authorization":`Bearer ${token}`
            }
        }
    );
    return await res.json();
}
export const fetchGroupMessages=async(
    token,
    groupId
)=>{
    const res=await fetch(
        `${API_BASE}/group-messages/${groupId}`,
        {
            headers:{
                "Authorization":`Bearer ${token}`
            }
        }
    );
    return res.json();
}
export const leaveGroup=async(token,groupId)=>{
    const res=await fetch(
        `http://localhost:5001/group/${groupId}/leave`,
        {
            method:"POST",
            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );
    return await res.json();
}
export const addMemberToGroup=async(
    token,
    groupId,
    email
)=>{
    const res=await fetch(
        `http://localhost:5001/group/${groupId}/add-member`,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`
            },
            body:JSON.stringify({email})
        }
        
    );
    return await res.json();
}
export const removeMemberFromGroup=async(
    token,
    groupId,
    email
)=>{
    const res=await fetch(
        `http://localhost:5001/group/${groupId}/remove-member`,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`
            },
            body:JSON.stringify({
                email
            })
        }
    );
    return await res.json();
}
export const archiveChat=async(
    token,
    chatId,
    chatType
)=>{
    const res=await fetch(
        "http://localhost:5001/archive",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`
            },
            body:JSON.stringify({
                chatId,
                chatType
            })
        }
    );
    return await res.json();
}
export const unarchiveChat=async(
    token,
    chatId
)=>{
    const res=await fetch(
        "http://localhost:5001/unarchive",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`
            },
            body:JSON.stringify({
                chatId
            })
        }
    );
    return await res.json();
}
export const getArchivedChats=async(token)=>{
  const res=await fetch(
    "http://localhost:5001/archived",
    {
        headers:{
            Authorization: `Bearer ${token}`
        }
    }
  );
  return await res.json();
}
export async function uploadGroupPhoto(token, groupId, photo) {

    const res = await fetch(
        `${API_BASE}/group/${groupId}/photo`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ photo })
        }
    );

    return res.json();
}
export const starMessage=async(token,messageId)=>{
    const res=await fetch(
        `http://localhost:5001/message/${messageId}/star`,
        {
            method:"POST",
            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );
    return await res.json();
}