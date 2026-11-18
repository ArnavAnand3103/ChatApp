import {io} from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";

export const createSocket=(token)=>{
    return io(SOCKET_URL,{
        auth:{token}
    });

};
