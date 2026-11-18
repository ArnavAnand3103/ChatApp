const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

const authHeaders = (token, withJson = true) => ({
    ...(withJson ? { "Content-Type": "application/json" } : {}),
    "Authorization": `Bearer ${token}`
});

export const fetchUsers = async (token, query = "") => {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const fetchMessages = async (token, targetEmail) => {
    const res = await fetch(`${API_BASE}/messages?with=${encodeURIComponent(targetEmail)}`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const loginRequest = async (email, password) => {
    const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    return res.json();
};

export const googleLoginRequest = async (payload) => {
    const body = typeof payload === "string" ? { credential: payload } : payload;
    const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return res.json();
};

export const signupRequest = async (name, email, password) => {
    const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });
    return res.json();
};

export const forgotPasswordRequest = async (email) => {
    const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    return res.json();
};

export const resetPasswordRequest = async (token, newPassword) => {
    const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
    });
    return res.json();
};

export const uploadProfilePhoto = async (token, photoData) => {
    const res = await fetch(`${API_BASE}/profile/photo`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ photoData })
    });
    return res.json();
};

export const deleteProfilePhoto = async (token) => {
    const res = await fetch(`${API_BASE}/profile/photo`, {
        method: "DELETE",
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const updateProfile = async (token, updates) => {
    const res = await fetch(`${API_BASE}/profile/update`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(updates)
    });
    return res.json();
};

export const fetchMutualGroups = async (token, targetEmail) => {
    const res = await fetch(`${API_BASE}/mutual-groups?with=${encodeURIComponent(targetEmail)}`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const reportUser = async (token, reportedUser, reason) => {
    const res = await fetch(`${API_BASE}/report`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ reportedUser, reason })
    });
    return res.json();
};

export const toggleBlockUser = async (token, targetEmail) => {
    const res = await fetch(`${API_BASE}/block/toggle`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ target: targetEmail })
    });
    return res.json();
};

export const fetchUserProfile = async (token, targetEmail) => {
    const res = await fetch(`${API_BASE}/user/profile/${encodeURIComponent(targetEmail)}`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const registerE2EEDevice = async (token, deviceBundle) => {
    const res = await fetch(`${API_BASE}/e2ee/devices`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(deviceBundle)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to register E2EE device");
    return data;
};

export const fetchE2EEDevices = async (token, targetEmail, claim = false) => {
    const q = claim ? "?claim=1" : "";
    const res = await fetch(`${API_BASE}/e2ee/devices/${encodeURIComponent(targetEmail)}${q}`, {
        headers: authHeaders(token, false)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to load E2EE devices");
    return data;
};

export const revokeE2EEDevice = async (token, deviceId) => {
    const res = await fetch(`${API_BASE}/e2ee/devices/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: authHeaders(token, false)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to revoke E2EE device");
    return data;
};

export const fetchAnalytics = async (token) => {
    const res = await fetch(`${API_BASE}/analytics`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const fetchMe = async (token) => {
    const res = await fetch(`${API_BASE}/me`, {
        headers: authHeaders(token, false)
    });
    return res.json();
};

export const downloadMedia = async (token, messageId) => {
    const res = await fetch(`${API_BASE}/media/${encodeURIComponent(messageId)}/download`, {
        headers: authHeaders(token, false)
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download media");
    }
    return res.blob();
};
export const createGroup=async(token,data)=>{
    const res=await fetch(`${API_BASE}/create-group`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return res.json();
}

export const getGroups=async(token)=>{
    const res=await fetch(`${API_BASE}/groups`,{
        headers:{
            "Authorization":`Bearer ${token}`
        }
    });
    return res.json();
}
export const fetchGroupInfo=async(token,groupId)=>{
    const res=await fetch(
        `${API_BASE}/group/${groupId}`,{
            headers:{
                "Authorization":`Bearer ${token}`
            }
        }
    }
    );
    return await res.json();
}
export const fetchGroupMessages = async (
    token,
    groupId
) => {
    const res = await fetch(
        `${API_BASE}/group-messages/${groupId}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );
    return res.json();
}
export const leaveGroup = async (token, groupId) => {
    const res = await fetch(
        `${API_BASE}/group/${groupId}/leave`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return await res.json();
}
export const addMemberToGroup = async (
    token,
    groupId,
    email
) => {
    const res = await fetch(
        `${API_BASE}/group/${groupId}/add-member`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        }

    );
    return await res.json();
}
export const removeMemberFromGroup = async (
    token,
    groupId,
    email
) => {
    const res = await fetch(
        `${API_BASE}/group/${groupId}/remove-member`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                email
            })
        }
    );
    return await res.json();
}
export const archiveChat = async (
    token,
    chatId,
    chatType
) => {
    const res = await fetch(
        `${API_BASE}/archive`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                chatId,
                chatType
            })
        }
    );
    return await res.json();
}
export const unarchiveChat = async (
    token,
    chatId
) => {
    const res = await fetch(
        `${API_BASE}/unarchive`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                chatId
            })
        }
    );
    return await res.json();
}
export const getArchivedChats=async(token)=>{
  const res=await fetch(
    `${API_BASE}/archived`,
    {
        headers:{
            Authorization: `Bearer ${token}`
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
export const starMessage = async (token, messageId) => {
    const res = await fetch(
        `${API_BASE}/message/${messageId}/star`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return await res.json();
}
export const fetchStarredMessages = async (token) => {
    const res = await fetch(
        `${API_BASE}/messages/starred`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return await res.json();
}

export const chatWithAI = async (message) => {
    const token = sessionStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message })
    });
    return await res.json();
};

export const fetchAIHistory = async (token) => {
    const res = await fetch(`${API_BASE}/api/ai/chat/history`, {
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const generateImage = async (prompt) => {
    const token = sessionStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/ai/image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || "Failed to generate image");
    }
    return data;
};

export const editImage = async (token, { basePrompt, editPrompt }) => {
    const res = await fetch(`${API_BASE}/api/ai/image/edit`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ basePrompt, editPrompt })
    });
    return await res.json();
};

export const uploadRAGDocument = async (token, { fileData, filename, text }) => {
    const res = await fetch(`${API_BASE}/api/ai/document/upload`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ fileData, filename, text })
    });
    return await res.json();
};

export const queryRAGDocument = async (token, query) => {
    const res = await fetch(`${API_BASE}/api/ai/document/query`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ query })
    });
    return await res.json();
};

export const fetchRAGDocumentStatus = async (token) => {
    const res = await fetch(`${API_BASE}/api/ai/document/status`, {
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const clearRAGDocument = async (token) => {
    const res = await fetch(`${API_BASE}/api/ai/document`, {
        method: "DELETE",
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const queryChatRAG = async (token, { query, scope, targetEmail, groupId }) => {
    const res = await fetch(`${API_BASE}/api/ai/chat-rag`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ query, scope, targetEmail, groupId })
    });
    return await res.json();
};

export const performSemanticSearch = async (token, { query, scope, targetEmail, groupId }) => {
    const res = await fetch(`${API_BASE}/api/ai/semantic-search`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ query, scope, targetEmail, groupId })
    });
    return await res.json();
};

export const extractTasks = async (token, { scope, targetEmail, groupId, source }) => {
    const res = await fetch(`${API_BASE}/api/ai/tasks/extract`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ scope, targetEmail, groupId, source })
    });
    return await res.json();
};

export const fetchCallHistory = async (token, targetEmail = "") => {
    const url = targetEmail
        ? `${API_BASE}/call-history?with=${encodeURIComponent(targetEmail)}`
        : `${API_BASE}/call-history`;
    const res = await fetch(url, {
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const backupChat = async (token, { withUser, groupId } = {}) => {
    let url = `${API_BASE}/chat/backup`;
    if (groupId) {
        url += `?groupId=${encodeURIComponent(groupId)}`;
    } else if (withUser) {
        url += `?with=${encodeURIComponent(withUser)}`;
    }
    const res = await fetch(url, {
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const restoreChat = async (token, messages) => {
    const res = await fetch(`${API_BASE}/chat/restore`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ messages })
    });
    return await res.json();
};

export const createCloudBackup = async (token, options = {}) => {
    const res = await fetch(`${API_BASE}/api/backups`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(options)
    });
    return await res.json();
};

export const listCloudBackups = async (token) => {
    const res = await fetch(`${API_BASE}/api/backups`, {
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const restoreCloudBackup = async (token, id) => {
    const res = await fetch(`${API_BASE}/api/backups/${encodeURIComponent(id)}/restore`, {
        method: "POST",
        headers: authHeaders(token, false)
    });
    return await res.json();
};

export const importCloudBackup = async (token, backup) => {
    const res = await fetch(`${API_BASE}/api/backups/import`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ backup })
    });
    return await res.json();
};