const activeCalls = new Set();
const callStartTimes = new Map();
import CallHistory from "../models/CallHistory.js";
import Group from "../models/Group.js";
const pendingCalls = new Map();

const activeGroupCalls = new Map();

export default function registerCallSocket(io, socket, users) {

    // ==========================
    // Helper
    // ==========================

    function emitToUser(email, event, payload) {

        Object.keys(users)
            .filter(id => users[id]?.email === email)
            .forEach(id => {

                io.to(id).emit(
                    event,
                    payload
                );

            });

    }

    // ==========================
    // Start Call
    // ==========================

  socket.on("callUser", ({ to, callType }) => {

    const receiverSockets = Object.keys(users).filter(
        id => users[id]?.email === to
    );

    if (receiverSockets.length === 0) {

        socket.emit("userUnavailable");

        return;

    }

    if (activeCalls.has(to)) {

        socket.emit("userBusy");

        return;

    }

    activeCalls.add(socket.user.email);

    activeCalls.add(to);

    emitToUser(
        to,
        "incomingCall",
        {
            from: socket.user.email,
            fromName: socket.user.name,
            callType
        }
    );
   const key = [socket.user.email, to].sort().join("-");

const timeout = setTimeout(async () => {

    pendingCalls.delete(key);

    activeCalls.delete(socket.user.email);

    activeCalls.delete(to);

    await CallHistory.create({

        caller: socket.user.email,

        receiver: to,

        type: "audio",

        status: "missed",

        startedAt: new Date(),

        endedAt: new Date()

    });

    socket.emit("callMissed");

    emitToUser(
        to,
        "callMissed",
        {
            from: socket.user.email
        }
    );

},30000);

pendingCalls.set(key,timeout);

});

    // ==========================
    // Accept Call
    // ==========================

    socket.on("acceptCall", ({ to }) => {

        const key = [socket.user.email, to].sort().join("-");

if(pendingCalls.has(key)){

    clearTimeout(

        pendingCalls.get(key)

    );

    pendingCalls.delete(key);
    callStartTimes.set(key, Date.now());

}

        emitToUser(
            to,
            "callAccepted",
            {
                from: socket.user.email
            }
        );

    });

    // ==========================
    // Reject Call
    // ==========================

   socket.on("rejectCall", async ({ to }) => {

    const key = [socket.user.email, to].sort().join("-");

    // Remove active call
    activeCalls.delete(socket.user.email);
    activeCalls.delete(to);

    // Cancel missed-call timeout
    if (pendingCalls.has(key)) {

        clearTimeout(pendingCalls.get(key));

        pendingCalls.delete(key);

    }

    // Save call history
    await CallHistory.create({

        caller: to,

        receiver: socket.user.email,

        type: "audio",

        status: "rejected",

        startedAt: new Date(),

        endedAt: new Date()

    });

    emitToUser(
        to,
        "callRejected",
        {
            from: socket.user.email
        }
    );

});

    // ==========================
    // End Call
    // ==========================
socket.on("endCall", async ({ to }) => {

    activeCalls.delete(socket.user.email);

    activeCalls.delete(to);

    const pendingKey = [socket.user.email, to].sort().join("-");

    if (pendingCalls.has(pendingKey)) {

        clearTimeout(pendingCalls.get(pendingKey));

        pendingCalls.delete(pendingKey);

    }

    const callKey = [socket.user.email, to].sort().join("-");

    const started = callStartTimes.get(callKey);

    await CallHistory.create({

        caller: socket.user.email,

        receiver: to,

        type: "audio",

        status: "completed",

        startedAt: started
            ? new Date(started)
            : new Date(),

        endedAt: new Date()

    });

    callStartTimes.delete(callKey);

    emitToUser(
        to,
        "callEnded",
        {
            from: socket.user.email
        }
    );

});   // ==========================
    // WebRTC Offer
    // ==========================

    socket.on("webrtcOffer", ({ to, offer }) => {
            console.log("Offer ->", to);
        emitToUser(
            to,
            "webrtcOffer",
            {
                from: socket.user.email,
                offer
            }
        );

    });

    // ==========================
    // WebRTC Answer
    // ==========================

    socket.on("webrtcAnswer", ({ to, answer }) => {
        console.log("Answer ->", to);
        emitToUser(
            to,
            "webrtcAnswer",
            {
                from: socket.user.email,
                answer
            }
        );

    });

    // ==========================
    // ICE Candidate
    // ==========================

    socket.on("iceCandidate", ({ to, candidate }) => {
            console.log("ICE ->", to);
        emitToUser(
            to,
            "iceCandidate",
            {
                from: socket.user.email,
                candidate
            }
        );

    });
    socket.on("disconnect", async () => {
        const myEmail = socket.user?.email;
        if (!myEmail) return;

        activeCalls.delete(myEmail);

        // Find and clean up any pending calls involving this user
        for (const [key, timeout] of pendingCalls.entries()) {
            if (key.includes(myEmail)) {
                clearTimeout(timeout);
                pendingCalls.delete(key);

                const otherEmail = key.split("-").find(email => email !== myEmail);
                activeCalls.delete(otherEmail);

                // Save missed call history
                await CallHistory.create({
                    caller: myEmail,
                    receiver: otherEmail,
                    type: "audio",
                    status: "missed",
                    startedAt: new Date(),
                    endedAt: new Date()
                });

                // Notify other user
                emitToUser(otherEmail, "callMissed", { from: myEmail });
            }
        }

        // Find and clean up any active calls involving this user
        for (const [key, started] of callStartTimes.entries()) {
            if (key.includes(myEmail)) {
                const otherEmail = key.split("-").find(email => email !== myEmail);
                callStartTimes.delete(key);
                activeCalls.delete(otherEmail);

                // Save completed call history
                await CallHistory.create({
                    caller: myEmail,
                    receiver: otherEmail,
                    type: "audio",
                    status: "completed",
                    startedAt: started ? new Date(started) : new Date(),
                    endedAt: new Date()
                });

                // Notify other user that call ended
                emitToUser(otherEmail, "callEnded", { from: myEmail });
            }
        }

        // Clean up group calls
        for (const [groupId, groupParticipants] of activeGroupCalls.entries()) {
            for (const [email, participant] of groupParticipants.entries()) {
                if (participant.socketId === socket.id) {
                    groupParticipants.delete(email);
                    socket.to(`group-call-${groupId}`).emit("groupCallUserLeft", { email, socketId: socket.id });

                    if (groupParticipants.size === 0) {
                        activeGroupCalls.delete(groupId);
                        io.emit("groupCallActiveStatus", {
                            groupId,
                            isActive: false,
                            participantCount: 0
                        });
                    } else {
                        io.emit("groupCallActiveStatus", {
                            groupId,
                            isActive: true,
                            participantCount: groupParticipants.size
                        });
                    }
                }
            }
        }
    });

    // ==========================================
    // Phase 3 Group Call Socket Event Handlers
    // ==========================================

    // Send active group calls to the newly connected user
    const activeGroupsList = {};
    for (const [groupId, participants] of activeGroupCalls.entries()) {
        activeGroupsList[groupId] = {
            isActive: true,
            participantCount: participants.size
        };
    }
    socket.emit("groupCallActiveStatusInit", activeGroupsList);

    // Join group call
    socket.on("joinGroupCall", async ({ groupId, callType }) => {
        if (!groupId) return;
        socket.join(`group-call-${groupId}`);

        if (!activeGroupCalls.has(groupId)) {
            activeGroupCalls.set(groupId, new Map());
        }
        const groupParticipants = activeGroupCalls.get(groupId);
        const email = socket.user.email;
        const participantInfo = {
            socketId: socket.id,
            email,
            name: socket.user.name,
            photo: socket.user.photo || "",
            callType
        };
        groupParticipants.set(email, participantInfo);

        // Notify other participants in the group call
        socket.to(`group-call-${groupId}`).emit("groupCallUserJoined", participantInfo);

        // Send current list of participants to the joiner (excluding themselves)
        const participantsList = Array.from(groupParticipants.values()).filter(p => p.email !== email);
        socket.emit("groupCallCurrentParticipants", participantsList);

        // Broadcast active status of the group call
        io.emit("groupCallActiveStatus", {
            groupId,
            isActive: true,
            participantCount: groupParticipants.size
        });

        // ── Ring all online group members when call is first started ──
        if (groupParticipants.size === 1) {
            try {
                const group = await Group.findById(groupId).lean();
                if (group && group.members) {
                    const callerEmail = socket.user.email;
                    group.members.forEach((memberEmail) => {
                        if (memberEmail === callerEmail) return;
                        // Find all sockets for this member
                        Object.keys(users).forEach((sid) => {
                            if (users[sid]?.email === memberEmail) {
                                io.to(sid).emit("incomingGroupCall", {
                                    groupId,
                                    groupName: group.name || "Group",
                                    callerName: socket.user.name,
                                    callerEmail,
                                    callType
                                });
                            }
                        });
                    });
                }
            } catch (err) {
                console.error("Error ringing group members:", err);
            }
        }
    });

    // Leave group call
    const handleLeaveGroupCall = (groupId) => {
        if (!groupId) return;
        socket.leave(`group-call-${groupId}`);

        const groupParticipants = activeGroupCalls.get(groupId);
        if (groupParticipants) {
            const email = socket.user?.email;
            if (email && groupParticipants.has(email)) {
                groupParticipants.delete(email);
                socket.to(`group-call-${groupId}`).emit("groupCallUserLeft", { email, socketId: socket.id });
            }

            if (groupParticipants.size === 0) {
                activeGroupCalls.delete(groupId);
                io.emit("groupCallActiveStatus", {
                    groupId,
                    isActive: false,
                    participantCount: 0
                });
            } else {
                io.emit("groupCallActiveStatus", {
                    groupId,
                    isActive: true,
                    participantCount: groupParticipants.size
                });
            }
        }
    };

    socket.on("leaveGroupCall", ({ groupId }) => {
        handleLeaveGroupCall(groupId);
    });

    // Mesh signaling routes
    socket.on("groupCallOffer", ({ groupId, toSocketId, offer }) => {
        io.to(toSocketId).emit("groupCallOffer", {
            groupId,
            fromEmail: socket.user.email,
            fromSocketId: socket.id,
            offer
        });
    });

    socket.on("groupCallAnswer", ({ groupId, toSocketId, answer }) => {
        io.to(toSocketId).emit("groupCallAnswer", {
            groupId,
            fromEmail: socket.user.email,
            fromSocketId: socket.id,
            answer
        });
    });

    socket.on("groupCallIceCandidate", ({ groupId, toSocketId, candidate }) => {
        io.to(toSocketId).emit("groupCallIceCandidate", {
            groupId,
            fromEmail: socket.user.email,
            fromSocketId: socket.id,
            candidate
        });
    });

};