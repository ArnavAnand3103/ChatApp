export function registerCallSocket(socket, handlers) {

    if (!socket) return;

    const {

        setIncomingCall,
        setOutgoingCall,
        setCallStatus,
        setIsCaller,
        setCallPartner,

        setLocalStream,
        setRemoteStream,
        localStreamRef,
        setGroupCallActiveStatusMap,
        setIncomingGroupCall
    } = handlers;

    // ===========================
    // Incoming Call
    // ===========================

    socket.on("incomingCall", (data) => {
         console.log("incomingCall", data);
        setIncomingCall(data);

        setCallStatus("ringing");

    });

    // ===========================
    // Call Accepted
    // ===========================

    socket.on("callAccepted", () => {
         console.log("callAccepted");
        // Keep outgoingCall representing the active call
        setCallStatus("connecting");

    });

    // ===========================
    // Call Rejected
    // ===========================

    socket.on("callRejected", () => {
        console.log("callRejected");
        setIncomingCall(null);
        setOutgoingCall(null);
        setIsCaller(false);
        setCallPartner(null);

        setCallStatus("ended");

    });

    // ===========================
    // Call Ended
    // ===========================

    socket.on("callEnded", () => {
         console.log("callEnded");
        localStreamRef.current?.getTracks().forEach(track =>
            track.stop()
        );

        setLocalStream(null);

        setRemoteStream(null);

        setIncomingCall(null);

        setOutgoingCall(null);
        setIsCaller(false);
        setCallPartner(null);

        setCallStatus("idle");

    });

    // ===========================
    // Offline
    // ===========================

    socket.on("userUnavailable", () => {
         console.log("userUnavailable");
        alert("User is offline.");

        setIncomingCall(null);
        setOutgoingCall(null);
        setIsCaller(false);
        setCallPartner(null);

        setCallStatus("idle");

    });

    // ===========================
    // Busy
    // ===========================

    socket.on("userBusy", () => {
         console.log("userBusy");
        alert("User is already in another call.");

        setIncomingCall(null);
        setOutgoingCall(null);
        setIsCaller(false);
        setCallPartner(null);

        setCallStatus("idle");

    });

    // ===========================
    // Missed Call
    // ===========================

    socket.on("callMissed", () => {
         console.log("callMissed");
        alert("Missed Call");

        setIncomingCall(null);

        setOutgoingCall(null);
        setIsCaller(false);
        setCallPartner(null);

        setCallStatus("idle");

    });

    // ===========================
    // Group Call Active Status
    // ===========================

    socket.on("groupCallActiveStatusInit", (activeCallsMap) => {
        setGroupCallActiveStatusMap(activeCallsMap || {});
    });

    socket.on("groupCallActiveStatus", ({ groupId, isActive, participantCount }) => {
        setGroupCallActiveStatusMap(prev => ({
            ...prev,
            [groupId]: { isActive, participantCount }
        }));
        // Auto-dismiss ring if the group call ended
        if (!isActive) {
            setIncomingGroupCall(prev => {
                if (prev && prev.groupId === groupId) return null;
                return prev;
            });
        }
    });

    // ===========================
    // Incoming Group Call (Ring)
    // ===========================

    socket.on("incomingGroupCall", (data) => {
        console.log("incomingGroupCall", data);
        setIncomingGroupCall(data);
    });

}

export function unregisterCallSocket(socket) {

    if (!socket) return;

    socket.off("incomingCall");
    socket.off("callAccepted");
    socket.off("callRejected");
    socket.off("callEnded");

    socket.off("userUnavailable");
    socket.off("userBusy");
    socket.off("callMissed");

    socket.off("webrtcOffer");
    socket.off("webrtcAnswer");
    socket.off("iceCandidate");

    socket.off("groupCallActiveStatusInit");
    socket.off("groupCallActiveStatus");
    socket.off("incomingGroupCall");

}