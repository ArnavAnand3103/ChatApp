import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useCall } from "../../context/CallContext";

import {
    createPeer,
    addTracks,
    makeOffer,
    makeAnswer,
    setRemote,
    addIce,
    closePeer,
    getScreenStream,
    getLocalVideoStream
} from "../../services/peer";

const CallManager = forwardRef(function CallManager({
    socket,
    selectedUser
}, ref) {

    const peerRef = useRef(null);

    const remoteAudioRef = useRef(null);

    const {
        localStream,
        remoteStream,
        setRemoteStream,
        isCaller,
        callStatus,
        callPartner,

         setCallStatus,

         callStartedAt,
       setCallStartedAt,

        setLocalStream,
        setCameraEnabled,
        setIsScreenSharing,
    } = useCall();

    const localStreamRef = useRef(localStream);
    localStreamRef.current = localStream;

    const callPartnerRef = useRef(callPartner);
    callPartnerRef.current = callPartner;

    const callStatusRef = useRef(callStatus);
    callStatusRef.current = callStatus;

    // ===========================
    // Get/Create Peer
    // ===========================

    const getPeer = () => {

        if (peerRef.current) {
            return peerRef.current;
        }

        const peer = createPeer();

        peerRef.current = peer;

        return peer;

    };

    // ===========================
    // Prepare Peer
    // ===========================

    const preparePeer = () => {

        const peer = getPeer();

        if (localStreamRef.current) {
            addTracks(peer, localStreamRef.current);
        }

        peer.ontrack = (event) => {

            setRemoteStream(event.streams[0]);

        };

        peer.onicecandidate = (event) => {

            if (!event.candidate) return;

            const partnerEmail = callPartnerRef.current?.email || selectedUser?.email;

            if (!partnerEmail) return;

            socket.emit("iceCandidate", {

                to: partnerEmail,

                candidate: event.candidate

            });

        };

        return peer;

    };

    // ===========================
    // Caller
    // ===========================

    const startOffer = async () => {

        const partnerEmail = callPartnerRef.current?.email || selectedUser?.email;

        if (!partnerEmail) return;

        const peer = preparePeer();
        console.log("Creating Offer");

        const offer = await makeOffer(peer);

        socket.emit("webrtcOffer", {

            to: partnerEmail,

            offer

        });

    };

    // ===========================
    // Receiver
    // ===========================
   
    const receiveOffer = async ({ from, offer }) => {
         console.log("Received Offer");

        const peer = preparePeer();

        await setRemote(peer, offer);

        console.log("Creating Answer");

        const answer = await makeAnswer(peer);

        socket.emit("webrtcAnswer", {

            to: from,

            answer

        });

        setCallStatus("connected");

        setCallStartedAt(Date.now());

    };

    // ===========================
    // Caller receives Answer
    // ===========================

    

  const receiveAnswer = async ({ answer }) => {
     console.log("Received Answer");

    if (!peerRef.current) return;

    await setRemote(
        peerRef.current,
        answer
    );

    // Call is now connected
    setCallStatus("connected");

    setCallStartedAt(Date.now());

};

    // ===========================
    // Remote Audio
    // ===========================

    useEffect(() => {

        if (
            remoteAudioRef.current &&
            remoteStream
        ) {

            remoteAudioRef.current.srcObject =
                remoteStream;

        }

    }, [remoteStream]);

    // ===========================
    // ICE Candidate Listener
    // ===========================

    useEffect(() => {

        if (!socket) return;

        const handleIce = async ({ candidate }) => {

            if (!peerRef.current) return;

            try {

                await addIce(

                    peerRef.current,

                    candidate

                );

            } catch (err) {

                console.error(err);

            }

        };

        socket.on(

            "iceCandidate",

            handleIce

        );

        return () => {

            socket.off(

                "iceCandidate",

                handleIce

            );

        };

    }, [socket]);

    // ===========================
    // Offer / Answer Listeners
    // ===========================

    useEffect(() => {

        if (!socket) return;

        socket.on(

            "webrtcOffer",

            receiveOffer

        );

        socket.on(

            "webrtcAnswer",

            receiveAnswer

        );

        return () => {

            socket.off(

                "webrtcOffer",

                receiveOffer

            );

            socket.off(

                "webrtcAnswer",

                receiveAnswer

            );

        };

    }, [socket]);

    // ===========================
    // Caller Starts Negotiation
    // ===========================

    useEffect(() => {

        if (!isCaller) return;

        if (!localStream) return;

        if (!selectedUser) return;

        if (callStatus !== "connecting") return;

        startOffer();

    }, [

        isCaller,

        localStream,

        selectedUser,

        callStatus

    ]);

    // ===========================
    // Cleanup
    // ===========================

useEffect(() => {

    return () => {

        if (peerRef.current) {

            closePeer(peerRef.current);

            peerRef.current = null;

        }

    };

}, []);

    // ===========================
    // Replace video track on peer
    // ===========================

    const replaceVideoTrack = async (newTrack) => {

        if (!peerRef.current) return;

        const senders = peerRef.current.getSenders();

        const videoSender = senders.find(s => s.track && s.track.kind === "video");

        if (videoSender) {

            await videoSender.replaceTrack(newTrack);

        } else if (newTrack) {

            // No video sender yet — add the track
            peerRef.current.addTrack(newTrack, localStreamRef.current);

        }

    };

    // ===========================
    // Toggle Camera (enable / disable)
    // ===========================

    const handleToggleCamera = async (currentStream) => {

        if (!currentStream) return;

        const videoTracks = currentStream.getVideoTracks();

        if (videoTracks.length === 0) return;

        const enabled = !videoTracks[0].enabled;

        videoTracks.forEach(t => { t.enabled = enabled; });

        setCameraEnabled(enabled);

    };

    // ===========================
    // Switch Camera (facingMode)
    // ===========================

    const handleSwitchCamera = async (currentStream, currentFacingMode, setFacingMode) => {

        const nextFacing = currentFacingMode === "user" ? "environment" : "user";

        try {

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: nextFacing },
                audio: false,
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Replace on peer
            await replaceVideoTrack(newVideoTrack);

            // Swap track in the local stream object
            if (currentStream) {

                currentStream.getVideoTracks().forEach(t => {
                    t.stop();
                    currentStream.removeTrack(t);
                });

                currentStream.addTrack(newVideoTrack);

            }

            // Force re-render by updating localStream reference
            setLocalStream(currentStream);

            setFacingMode(nextFacing);

        } catch (err) {

            console.warn("Switch camera error:", err);

        }

    };

    // ===========================
    // Screen Share
    // ===========================

    const handleScreenShare = async (currentStream, isScreenSharing) => {

        if (isScreenSharing) {

            // Stop screen share, revert to camera
            try {

                const cameraStream = await getLocalVideoStream();

                const camTrack = cameraStream.getVideoTracks()[0];

                await replaceVideoTrack(camTrack);

                // Swap tracks in the local stream
                if (currentStream) {

                    currentStream.getVideoTracks().forEach(t => {
                        t.stop();
                        currentStream.removeTrack(t);
                    });

                    currentStream.addTrack(camTrack);

                }

                setLocalStream(currentStream);

                setIsScreenSharing(false);

            } catch (err) {

                console.warn("Stop screen share error:", err);

            }

        } else {

            // Start screen share
            try {

                const screenStream = await getScreenStream();

                const screenTrack = screenStream.getVideoTracks()[0];

                await replaceVideoTrack(screenTrack);

                // Swap tracks in the local stream
                if (currentStream) {

                    currentStream.getVideoTracks().forEach(t => {
                        t.stop();
                        currentStream.removeTrack(t);
                    });

                    currentStream.addTrack(screenTrack);

                }

                setLocalStream(currentStream);

                setIsScreenSharing(true);

                // Auto-stop when user clicks browser's "Stop sharing"
                screenTrack.onended = () => {

                    handleScreenShare(currentStream, true);

                };

            } catch (err) {

                console.warn("Screen share error:", err);

            }

        }

    };

    // ===========================
    // Expose imperative handle
    // ===========================

    useImperativeHandle(ref, () => ({
        handleToggleCamera,
        handleSwitchCamera,
        handleScreenShare,
    }));


    return (

        <audio

            ref={remoteAudioRef}

            autoPlay

            playsInline

        />

    );

});

export default CallManager;