import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function Home(){
    const navigate=useNavigate();
    const {token}=useAuth();

    return (
        <div style={{
            minHeight:"100vh",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            background:"linear-gradient(135deg,#5865F2,#000000)",
            color:"white",
            textAlign:"center",
            padding:"20px"
        }}>
            <div style={{maxWidth:"420px"}}>
                <img
                src="/discordimg.jpg"
                alt="Project2"
                style={{width:"220px",height:"220px",objectFit:"contain",marginBottom:"24px",borderRadius:"20px"}}
                />
                <h1 style={{fontSize:"40px",marginBottom:"10px"}}>Get started</h1>
                <p style={{color:"#d1d5db",marginBottom:"24px"}}>Welcome to Project2 Chat</p>
                <button
                style={{
                    padding:"14px 30px",
                    border:"2px solid white",
                    borderRadius:"30px",
                    background:"transparent",
                    color:"white",
                    fontSize:"16px",
                    fontWeight:"bold",
                    cursor:"pointer",
                    transition:"transform 0.2s ease"
                }}
                onClick={()=>navigate(token?"/chat":"/login")}>
                    Get Started
                </button>
            </div>
        </div>
    );
}
