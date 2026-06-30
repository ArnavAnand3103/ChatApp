import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {forgotPasswordRequest,loginRequest,resetPasswordRequest} from '../services/api';

export default function Login(){
    const navigate=useNavigate();

    const {login}=useAuth();

    const [email,setEmail]=useState("");
    const[password,setPassword]=useState("");

    const handleLogin=async()=>{
        const emailRegex=/^\S+@\S+\.\S+$/;

        if(!emailRegex.test(email)){
            alert("Enter a valid email address");
            return;
        }

        if(!email||!password){
            alert("Fill all fields");
            return;
        }

        try{
            const data=await loginRequest(email,password);

            if(data.message==="Invalid credentials"){
                alert("Wrong email or password");
                return;
            }

            if(!data.user||!data.user.email){
                alert("Login failed: user data missing");
                return;
            }

            login(data.user,data.token);
            sessionStorage.setItem('user',JSON.stringify(data.user));
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigate("/chat");
        } catch(err){
            alert("Server error");
        }
    };

    const handleForgotPassword=async()=>{
        const emailInput=email.trim()||prompt("Enter your account email:");
        if(!emailInput) return;

        try{
            const forgotData=await forgotPasswordRequest(emailInput);
            if(!forgotData.token){
                alert(forgotData.message||"Could not generate reset token");
                return;
            }

            const token=prompt("Reset token generated. Paste token here to continue:",forgotData.token);
            if(!token) return;

            const newPassword=prompt("Enter new password (8+ digits):");
            if(!newPassword) return;

            const confirmPassword=prompt("Confirm new password:");
            if(newPassword!==confirmPassword){
                alert("Passwords do not match");
                return;
            }

            const resetData=await resetPasswordRequest(token,newPassword);
            alert(resetData.message||"Password reset complete");
        }catch(err){
            alert(`Reset failed: ${err.message}`);
        }
    };

    return(
        <div style={{
            minHeight:"100vh",
            width:"100vw",
            display:"flex",
            justifyContent:"center",
            alignItems:"center",
            background:"linear-gradient(135deg, #ff00cc, #3333ff, #00ffcc)",
            backgroundSize:"300% 300%",
            padding:"20px"
        }}>
            <div style={{
                width:"100%",
                maxWidth:"360px",
                background:"rgba(255,255,255,0.12)",
                backdropFilter:"blur(14px)",
                borderRadius:"20px",
                padding:"28px",
                boxShadow:"0 12px 30px rgba(0,0,0,0.35)"
            }}>
            <h2 style={{color:"white",marginBottom:"16px",textAlign:"center"}}>Chat App</h2>
            <input
            placeholder="Email"
            onChange={(e)=>setEmail(e.target.value)}
            style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",marginBottom:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}/>

            <input
            type="password"
            placeholder="Password"
            onChange={(e)=>setPassword(e.target.value)}
            style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",marginBottom:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}/>

            <p style={{color:"#f3f4f6",fontSize:"12px",textAlign:"left",lineHeight:1.45,marginTop:"4px",marginBottom:"12px"}}>
                Password must be 8+ digits
            </p>

            <button onClick={handleLogin} style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",background:"linear-gradient(45deg,#ff00cc,#00ffcc)",color:"white",cursor:"pointer",fontWeight:"600",marginBottom:"10px"}}>
                Login
            </button>

            <button onClick={handleForgotPassword} style={{width:"100%",padding:"12px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.35)",background:"transparent",color:"white",cursor:"pointer"}}>
                Forgot password?
            </button>

            <p style={{marginTop:"16px",color:"white",textAlign:"center"}}>
                Don't have account?
                <button onClick={()=>navigate("/signup")} style={{marginLeft:"8px",background:"none",border:"none",color:"#9fffe8",cursor:"pointer",textDecoration:"underline"}}>
                    Signup
                </button>
            </p>
            </div>
        </div>
    );
}