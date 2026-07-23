import {useState} from 'react';

import {useNavigate} from 'react-router-dom';
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";
import {signupRequest} from '../services/api';
import {getOrGenerateUserKeys} from '../utils/crypto';

export default function Signup(){
    const navigate=useNavigate();

    const [name,setname]=useState("");

    const [email,setEmail]=useState("");

    const [password,setPassword]=useState("");
    const [confirmPassword,setConfirmPassword]=useState("");

    const handleSignup=async()=>{
        const safeName=name.trim();
        const safeEmail=email.trim();

        if(!safeName||!safeEmail||!password||!confirmPassword){
            alert("Fill all fields");
            return;
        }

        const emailRegex=/^\S+@\S+\.\S+$/;
        if(!emailRegex.test(safeEmail)){
            alert("Enter a valid email address");
            return;
        }

        const strongPasswordRegex=/^\d{8,}$/;
        if(!strongPasswordRegex.test(password)){
            alert("Password must be 8+ digits");
            return;
        }

        if(password!==confirmPassword){
            alert("Passwords do not match");
            return;
        }

        try{
            const userKeys = await getOrGenerateUserKeys(safeEmail);
            const publicKey = userKeys.publicKey;
            const privateKey = userKeys.privateKey;
            const data=await signupRequest(safeName,safeEmail,password,publicKey);
            if(data.message==="Signup successful"){
                localStorage.setItem("privateKey", privateKey);
                localStorage.setItem(`e2ee_priv_${safeEmail.toLowerCase()}`, privateKey);
                localStorage.setItem(`e2ee_pub_${safeEmail.toLowerCase()}`, publicKey);
                alert("Signup success");
                navigate("/login");
            }else{
                alert(data.message);
            }
        }catch(err){
            alert("Error");
        }
    };
    return (
        <div style={{
            minHeight:"100vh",
            width:"100vw",
            display:"flex",
            justifyContent:"center",
            alignItems:"center",
            background:"linear-gradient(135deg,#5865F2,#000000)",
            color:"white",
            padding:"20px"
        }}>
            <div style={{
                width:"100%",
                maxWidth:"360px",
                background:"rgba(255,255,255,0.1)",
                backdropFilter:"blur(12px)",
                borderRadius:"20px",
                padding:"28px"
            }}>
            <h2 style={{marginBottom:"16px",textAlign:"center"}}>Create Account</h2>
            <input
            placeholder="Name"
            onChange={(e)=>setname(e.target.value)}
            style={{width:"100%",padding:"12px",marginBottom:"10px",border:"none",borderRadius:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}
            />

            <input
            placeholder="Email"
            onChange={(e)=>setEmail(e.target.value)}
            style={{width:"100%",padding:"12px",marginBottom:"10px",border:"none",borderRadius:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}/>
            <input
            type="password"
            placeholder="Password"
            onChange={(e)=>setPassword(e.target.value)}
            style={{width:"100%",padding:"12px",marginBottom:"10px",border:"none",borderRadius:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}/>

            <input
            type="password"
            placeholder="Confirm Password"
            onChange={(e)=>setConfirmPassword(e.target.value)}
            style={{width:"100%",padding:"12px",marginBottom:"12px",border:"none",borderRadius:"10px",background:"rgba(255,255,255,0.2)",color:"white"}}/>

            <button onClick={handleSignup} style={{width:"100%",padding:"12px",borderRadius:"10px",border:"none",background:"#5865F2",color:"white",cursor:"pointer",fontWeight:"600"}}>
                Signup
            </button>

            <p style={{marginTop:"16px",textAlign:"center"}}>
                Already have an account?
                <button onClick={()=>navigate("/login")} style={{marginLeft:"8px",border:"none",background:"none",color:"#9fffe8",textDecoration:"underline",cursor:"pointer"}}>
                    Login
                </button>
            </p>
            </div>
        </div>
    )


}