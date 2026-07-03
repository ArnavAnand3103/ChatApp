import {useEffect,useState} from "react";
import {fetchStarredMessages} from "../services/api";
import {useAuth} from "../context/AuthContext";

import {useNavigate} from "react-router-dom";

export default function StarredMessages(){

    const {token}=useAuth();
    const [messages,setMessages]=useState([]);
    const navigate=useNavigate();

    useEffect(()=>{

        const loadMessages=async ()=>{
            try{
                const data=await fetchStarredMessages(token);
                setMessages(Array.isArray(data)?data:[]);
            }catch{
                setMessages([]);
            }
        };
        loadMessages();
    },[token]);

   
    return (

        <div style={{ padding: "20px" }}>
            <button 
                onClick={() => navigate("/chat")}
                style={{
                    padding: "8px 16px",
                    marginBottom: "20px",
                    cursor: "pointer",
                    background: "#202c33",
                    color: "white",
                    border: "none",
                    borderRadius: "8px"
                }}
            >
                ← Back to Chat
            </button>

            <h2>⭐ Starred Messages</h2>

            {messages.length === 0 ? (

                <p>No starred messages</p>

            ) : (

                messages.map(msg => (

                    <div
                        key={msg._id}
                        style={{
                            background: "#202c33",
                            padding: "12px",
                            borderRadius: "10px",
                            marginBottom: "10px"
                        }}
                    >

                        <div>
                            <strong>{msg.from}</strong>
                        </div>

                        <div style={{ marginTop: "6px" }}>
                            {msg.message}
                        </div>

                    </div>

                ))

            )}

        </div>

    );

}