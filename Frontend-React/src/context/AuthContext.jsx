import {createContext,useContext,useState,useEffect} from 'react';
import { registerE2EEDevice } from '../services/api';

const AuthContext=createContext();

export const useAuth=()=>useContext(AuthContext);

export const AuthProvider=({children})=>{

    const [user,setUser]=useState(() => {
        const storedUser=sessionStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [token,setToken]=useState(() => sessionStorage.getItem("token"));
    const [e2eeState,setE2EEState]=useState({
        available:false,
        messageEncryptionEnabled:false,
        privateEnabled:false,
        groupEnabled:false,
        deviceRegistered:false,
        deviceId:null,
        error:null
    });

    useEffect(()=>{
        const storedUser=sessionStorage.getItem("user");

        const storedToken=sessionStorage.getItem("token");

        if(storedUser && storedToken){
            setUser(JSON.parse(storedUser));

            setToken(storedToken);
        }
    },[]);

    useEffect(()=>{
        let cancelled=false;

        const registerDesktopDevice=async()=>{
            if(!user?.email || !token) {
                setE2EEState({
                    available:false,
                    messageEncryptionEnabled:false,
                    deviceRegistered:false,
                    error:null
                });
                return;
            }

            const nativeBridge=window.chatAppNative;
            if(!nativeBridge) {
                setE2EEState({
                    available:false,
                    messageEncryptionEnabled:false,
                    deviceRegistered:false,
                    error:null
                });
                return;
            }

            try {
                const status=await nativeBridge.getE2EEStatus();
                if(cancelled) return;

                if(!status?.available) {
                    throw new Error("Native E2EE bridge is unavailable");
                }

                const bundle=await nativeBridge.ensureE2EEDevice(user.email);
                if(cancelled) return;

                await registerE2EEDevice(token,bundle);
                if(cancelled) return;

                setE2EEState({
                    available:true,
                    messageEncryptionEnabled:Boolean(status.messageEncryptionEnabled || status.private || status.group),
                    privateEnabled:Boolean(status.private || status.messageEncryptionEnabled),
                    groupEnabled:Boolean(status.group),
                    deviceRegistered:true,
                    deviceId: bundle?.deviceId || null,
                    error:null
                });
            } catch(error) {
                if(cancelled) return;
                console.error("E2EE device registration failed:",error);
                setE2EEState({
                    available:true,
                    messageEncryptionEnabled:false,
                    deviceRegistered:false,
                    error:error instanceof Error ? error.message : "E2EE device registration failed"
                });
            }
        };

        registerDesktopDevice();
        return ()=>{ cancelled=true; };
    },[token,user?.email]);

    const login=(userData,tokenData)=>{
        setUser(userData);
        setToken(tokenData);
        sessionStorage.setItem("user",JSON.stringify(userData));
        sessionStorage.setItem("token",tokenData);

    };

    const logout=()=>{
        setUser(null);
        setToken(null);
        setE2EEState({
            available:false,
            messageEncryptionEnabled:false,
            privateEnabled:false,
            groupEnabled:false,
            deviceRegistered:false,
            deviceId:null,
            error:null
        });
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");

    };
    return(
        <AuthContext.Provider value={{user,token,login,logout,e2eeState}}>
            {children}
        </AuthContext.Provider>
    );
};
