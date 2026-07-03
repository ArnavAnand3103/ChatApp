import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchUsers } from "../services/api";

export default function ForwardModal({
   
    onClose,
    onForward
}) {


    const {token}=useAuth();
    const [users,setUsers]=useState([]);
    const [selectedUser,setSelectedUser]=useState(null);
    useEffect(()=>{
        const loadUsers=async()=>{
            const data=await fetchUsers(token);
            if(Array.isArray(data)){
                setUsers(data);
            }
        };
        loadUsers();
    },[token]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 99999
            }}
        >
            <div
                style={{
                    width: "350px",
                    background: "#202c33",
                    borderRadius: "10px",
                    padding: "20px",
                    color: "white"
                }}
            >
                <h3>Forward Message</h3>

                <div
                    style={{
                        maxHeight: "250px",
                        overflowY: "auto"
                    }}
                >
                    {users.map(user => (

                        <div
                            key={user.email}
                            onClick={() => setSelectedUser(user)}
                            style={{
                                padding: "10px",
                                cursor: "pointer",
                                background:
                                    selectedUser?.email === user.email
                                        ? "#2a3942"
                                        : "transparent"
                            }}
                        >
                            {user.name}
                        </div>

                    ))}
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                        marginTop: "20px"
                    }}
                >
                    <button onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        disabled={!selectedUser}
                        onClick={() => onForward(selectedUser)}
                    >
                        Forward
                    </button>

                </div>

            </div>
        </div>
    );
}