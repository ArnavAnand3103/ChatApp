import {createContext,useContext,useState,useEffect} from 'react';

const AuthContext=createContext();

export const useAuth=()=>useContext(AuthContext);

export const AuthProvider=({children})=>{

    const [user,setUser]=useState(() => {
        const storedUser=sessionStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [token,setToken]=useState(() => sessionStorage.getItem("token"));

    useEffect(()=>{
        const storedUser=sessionStorage.getItem("user");

        const storedToken=sessionStorage.getItem("token");

        if(storedUser && storedToken){
            setUser(JSON.parse(storedUser));

            setToken(storedToken);
        }
    },[]);

    const login=(userData,tokenData)=>{
        setUser(userData);
        setToken(tokenData);
        sessionStorage.setItem("user",JSON.stringify(userData));
        sessionStorage.setItem("token",tokenData);

    };

    const logout=()=>{
        setUser(null);
        setToken(null);
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");

    };
    return(
        <AuthContext.Provider value={{user,token,login,logout}}>
            {children}
        </AuthContext.Provider>
    );
};
