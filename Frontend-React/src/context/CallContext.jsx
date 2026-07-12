import { createContext, useContext, useState } from "react";

const CallContext = createContext();

export function CallProvider({ children }) {

    const [incomingCall, setIncomingCall] = useState(null);

    const [outgoingCall, setOutgoingCall] = useState(null);

    const [callStatus, setCallStatus] = useState("idle");

    const [localStream, setLocalStream] = useState(null);

    const [isCaller, setIsCaller] = useState(false);

    const [callStartedAt, setCallStartedAt] = useState(null);

    const [remoteStream, setRemoteStream] = useState(null);

    const [muted, setMuted] = useState(false);

      const [callPartner, setCallPartner] = useState(null);

    // Video call extras
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Group call states
    const [activeGroupCall, setActiveGroupCall] = useState(null);
    const [groupCallStatus, setGroupCallStatus] = useState("idle"); // "idle" | "joining" | "connected"
    const [groupCallActiveStatusMap, setGroupCallActiveStatusMap] = useState({});
    const [incomingGroupCall, setIncomingGroupCall] = useState(null);

    // idle
    // calling
    // ringing
    // connected
    // ended

    return (

        <CallContext.Provider
            value={{

                incomingCall,
                setIncomingCall,

                outgoingCall,
                setOutgoingCall,

                callStatus,
                setCallStatus,

                localStream,
                 setLocalStream,

                remoteStream,
                 setRemoteStream,

                  isCaller,
                setIsCaller,

                callStartedAt,
                setCallStartedAt,

                muted,
                setMuted,

                callPartner,
                setCallPartner,

                isVideoCall,
                setIsVideoCall,

                cameraEnabled,
                setCameraEnabled,

                facingMode,
                setFacingMode,

                isScreenSharing,
                setIsScreenSharing,

                activeGroupCall,
                setActiveGroupCall,
                groupCallStatus,
                setGroupCallStatus,
                groupCallActiveStatusMap,
                setGroupCallActiveStatusMap,
                incomingGroupCall,
                setIncomingGroupCall
            }}
        >

            {children}

        </CallContext.Provider>

    );

}

export function useCall() {

    return useContext(CallContext);

}