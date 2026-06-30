import {io} from 'socket.io-client';

const SOCKET_URL="http://localhost:5001";

export const createSocket=(token)=>{
    return io(SOCKET_URL,{
        auth:{token}
    });

};
