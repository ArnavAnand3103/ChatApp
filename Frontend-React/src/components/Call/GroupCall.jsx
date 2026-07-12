import { useEffect, useRef, useState, useCallback } from "react";
import { useCall } from "../../context/CallContext";
import { useAuth } from "../../context/AuthContext";
import { getLocalAudioStream, getLocalVideoStream, getScreenStream, rtcConfig } from "../../services/peer";

// ─────────────────────────────────────────────
// Styles matching direct AudioCall & VideoCall
// ─────────────────────────────────────────────
const S = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "#0a0a0f",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    gridContainer: {
        flex: 1,
        padding: "24px 24px 160px", // extra bottom padding so cards aren't covered by controlBar
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
        position: "relative",
    },
    grid: {
        width: "100%",
        height: "100%",
        display: "grid",
        gap: "20px",
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        background: "rgba(30, 41, 59, 0.4)",
        border: "2px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        aspectRatio: "16/10",
        transition: "transform 0.25s, border-color 0.2s, box-shadow 0.2s",
        width: "100%",
        height: "100%",
    },
    activeSpeakerCard: {
        borderColor: "#10b981",
        boxShadow: "0 0 24px rgba(16, 185, 129, 0.45)",
        transform: "scale(1.02)",
    },
    video: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    remoteAvatar: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        color: "white",
    },
    avatarCircle: {
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6366f1, #3b82f6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "48px",
        fontWeight: "bold",
        color: "white",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        overflow: "hidden",
    },
    cardLabel: {
        position: "absolute",
        bottom: "12px",
        left: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        padding: "6px 12px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "500",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "white",
    },
    cardMuteBtn: {
        position: "absolute",
        top: "12px",
        right: "12px",
        background: "rgba(15, 23, 42, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "50%",
        width: "38px",
        height: "38px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "white",
        transition: "background 0.2s",
        fontSize: "15px",
        zIndex: 5,
    },
    controlBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "20px 24px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
        zIndex: 10,
    },
    infoRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        color: "white",
        marginBottom: "6px",
    },
    timerText: {
        fontFamily: "monospace",
        fontSize: "14px",
        fontWeight: "600",
        color: "#ef4444",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    btnRow: {
        display: "flex",
        gap: "16px",
        alignItems: "center",
    },
    btn: (active, color) => ({
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        border: "none",
        background: active ? color || "#2d3748" : "rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
        color: "white",
        fontSize: "22px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.15s, background 0.2s",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }),
    endBtn: {
        width: "68px",
        height: "68px",
        borderRadius: "50%",
        border: "none",
        background: "#ef4444",
        color: "white",
        fontSize: "26px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(239,68,68,0.5)",
        transition: "transform 0.15s",
    },
    labelRow: {
        display: "flex",
        gap: "16px",
        fontSize: "11px",
        color: "rgba(255,255,255,0.55)",
        marginTop: "4px",
    },
    label: {
        width: "60px",
        textAlign: "center",
    },
    endLabel: {
        width: "68px",
        textAlign: "center",
    },
    screenShareBadge: {
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(99,102,241,0.95)",
        color: "white",
        padding: "6px 16px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 600,
        backdropFilter: "blur(8px)",
        zIndex: 20,
    },
};

export default function GroupCall({ socket, onLeave }) {
    const { user } = useAuth();
    const {
        activeGroupCall,
        setCallStatus,
    } = useCall();

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // email -> MediaStream
    const [participants, setParticipants] = useState([]); // Array of peer info
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(activeGroupCall?.callType === "video");
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [locallyMuted, setLocallyMuted] = useState({}); // email -> boolean
    const [activeSpeaker, setActiveSpeaker] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const peersRef = useRef({}); // socketId -> RTCPeerConnection
    const localStreamRef = useRef(null);
    const analysersRef = useRef({}); // email -> { analyser, dataArray }
    const audioContextRef = useRef(null);
    const screenTrackRef = useRef(null);

    // Dynamic grid size calculations
    const getGridStyle = useCallback((count) => {
        if (count <= 1) return { gridTemplateColumns: "1fr", maxWidth: "800px" };
        if (count === 2) return { gridTemplateColumns: "1fr 1fr", maxWidth: "1200px" };
        if (count <= 4) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", maxWidth: "1200px" };
        return { gridTemplateColumns: "1fr 1fr 1fr", maxWidth: "1400px" };
    }, []);

    // Format timer string
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [
            h > 0 ? String(h).padStart(2, "0") : null,
            String(m).padStart(2, "0"),
            String(s).padStart(2, "0")
        ].filter(Boolean).join(":");
    };

    // Incremental timer
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ─────────────────────────────────────────────
    // Active Speaker Sound analysis Setup
    // ─────────────────────────────────────────────
    const setupAudioAnalysis = useCallback((email, stream) => {
        try {
            if (!stream || stream.getAudioTracks().length === 0) return;
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") {
                ctx.resume();
            }
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analysersRef.current[email] = { analyser, dataArray };
        } catch (err) {
            console.warn("Active speaker analysis setup failed:", email, err);
        }
    }, []);

    // Active Speaker Loop
    useEffect(() => {
        const interval = setInterval(() => {
            let maxVol = 0;
            let loudest = null;

            Object.entries(analysersRef.current).forEach(([email, { analyser, dataArray }]) => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                if (average > maxVol) {
                    maxVol = average;
                    loudest = email;
                }
            });

            // Threshold of volume 10 to highlight
            if (maxVol > 10) {
                setActiveSpeaker(loudest);
            } else {
                setActiveSpeaker(null);
            }
        }, 300);

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Clean up analysis when a participant leaves
    const removeAudioAnalysis = useCallback((email) => {
        if (analysersRef.current[email]) {
            delete analysersRef.current[email];
        }
    }, []);

    // Clean up all peers and tracks
    const cleanUpAllConnections = useCallback(() => {
        Object.values(peersRef.current).forEach(peer => {
            peer.close();
        });
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
        }
    }, []);

    // ─────────────────────────────────────────────
    // Initiate WebRTC peer to another participant
    // ─────────────────────────────────────────────
    const initiateCallToParticipant = useCallback(async (targetParticipant, stream) => {
        const socketId = targetParticipant.socketId;
        if (peersRef.current[socketId]) return;

        const peer = new RTCPeerConnection(rtcConfig);
        peersRef.current[socketId] = peer;

        // Add local tracks
        stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
        });

        // Ice candidate
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("groupCallIceCandidate", {
                    groupId: activeGroupCall.groupId,
                    toSocketId: socketId,
                    candidate: event.candidate
                });
            }
        };

        // Incoming track
        peer.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setRemoteStreams(prev => ({
                ...prev,
                [targetParticipant.email]: remoteStream
            }));
            setupAudioAnalysis(targetParticipant.email, remoteStream);
        };

        // Negotiation / Offer
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket.emit("groupCallOffer", {
                groupId: activeGroupCall.groupId,
                toSocketId: socketId,
                offer
            });
        } catch (err) {
            console.error("Create offer failed for:", targetParticipant.email, err);
        }
    }, [socket, activeGroupCall, setupAudioAnalysis]);

    // ─────────────────────────────────────────────
    // Component Mount / Room initialization
    // ─────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !activeGroupCall) return;

        const initLocalMedia = async () => {
            try {
                const stream = activeGroupCall.callType === "video"
                    ? await getLocalVideoStream()
                    : await getLocalAudioStream();

                setLocalStream(stream);
                localStreamRef.current = stream;

                // Setup local volume tracking
                if (user?.email) {
                    setupAudioAnalysis(user.email, stream);
                }

                // Join group call room
                socket.emit("joinGroupCall", {
                    groupId: activeGroupCall.groupId,
                    callType: activeGroupCall.callType
                });

                // Listeners
                socket.on("groupCallCurrentParticipants", (currentList) => {
                    setParticipants(currentList);
                    // Initiate WebRTC mesh connects to all existing members
                    currentList.forEach(p => {
                        initiateCallToParticipant(p, stream);
                    });
                });

                socket.on("groupCallUserJoined", (newParticipant) => {
                    setParticipants(prev => {
                        if (prev.some(p => p.email === newParticipant.email)) return prev;
                        return [...prev, newParticipant];
                    });
                });

                socket.on("groupCallUserLeft", ({ email, socketId }) => {
                    if (peersRef.current[socketId]) {
                        peersRef.current[socketId].close();
                        delete peersRef.current[socketId];
                    }
                    setParticipants(prev => prev.filter(p => p.email !== email));
                    setRemoteStreams(prev => {
                        const copy = { ...prev };
                        delete copy[email];
                        return copy;
                    });
                    removeAudioAnalysis(email);
                });

                socket.on("groupCallOffer", async ({ fromEmail, fromSocketId, offer }) => {
                    const peer = new RTCPeerConnection(rtcConfig);
                    peersRef.current[fromSocketId] = peer;

                    // Add local tracks
                    stream.getTracks().forEach(track => {
                        peer.addTrack(track, stream);
                    });

                    peer.onicecandidate = (event) => {
                        if (event.candidate) {
                            socket.emit("groupCallIceCandidate", {
                                groupId: activeGroupCall.groupId,
                                toSocketId: fromSocketId,
                                candidate: event.candidate
                            });
                        }
                    };

                    peer.ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        setRemoteStreams(prev => ({
                            ...prev,
                            [fromEmail]: remoteStream
                        }));
                        setupAudioAnalysis(fromEmail, remoteStream);
                    };

                    try {
                        await peer.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        socket.emit("groupCallAnswer", {
                            groupId: activeGroupCall.groupId,
                            toSocketId: fromSocketId,
                            answer
                        });
                    } catch (err) {
                        console.error("Answer negotiation failed for", fromEmail, err);
                    }
                });

                socket.on("groupCallAnswer", async ({ fromSocketId, answer }) => {
                    const peer = peersRef.current[fromSocketId];
                    if (peer) {
                        try {
                            await peer.setRemoteDescription(new RTCSessionDescription(answer));
                        } catch (err) {
                            console.error("Set remote answer failed", err);
                        }
                    }
                });

                socket.on("groupCallIceCandidate", async ({ fromSocketId, candidate }) => {
                    const peer = peersRef.current[fromSocketId];
                    if (peer && candidate) {
                        try {
                            await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.error("Add remote ICE candidate failed", err);
                        }
                    }
                });

            } catch (err) {
                console.error("Local media capture failed", err);
                alert("Permission denied or microphone/camera unavailable.");
                handleLeave();
            }
        };

        initLocalMedia();

        return () => {
            socket.off("groupCallCurrentParticipants");
            socket.off("groupCallUserJoined");
            socket.off("groupCallUserLeft");
            socket.off("groupCallOffer");
            socket.off("groupCallAnswer");
            socket.off("groupCallIceCandidate");
            cleanUpAllConnections();
        };
    }, [socket, activeGroupCall, initiateCallToParticipant, setupAudioAnalysis, removeAudioAnalysis, cleanUpAllConnections, user]);

    // ─────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────
    const handleLeave = () => {
        if (socket && activeGroupCall) {
            socket.emit("leaveGroupCall", { groupId: activeGroupCall.groupId });
        }
        cleanUpAllConnections();
        setCallStatus("idle");
        if (onLeave) onLeave();
    };

    const toggleMic = () => {
        if (localStream) {
            const tracks = localStream.getAudioTracks();
            tracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setMicEnabled(!micEnabled);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            const tracks = localStream.getVideoTracks();
            tracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setCameraEnabled(!cameraEnabled);
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop sharing, revert to camera
            try {
                if (screenTrackRef.current) {
                    screenTrackRef.current.stop();
                    screenTrackRef.current = null;
                }
                const originalStream = await getLocalVideoStream();
                const videoTrack = originalStream.getVideoTracks()[0];

                // Replace track on all active WebRTC peers
                for (const peer of Object.values(peersRef.current)) {
                    const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    }
                }

                // Swap local tracks
                localStream.getVideoTracks().forEach(t => {
                    t.stop();
                    localStream.removeTrack(t);
                });
                localStream.addTrack(videoTrack);
                setLocalStream(new MediaStream(localStream.getTracks()));

                setIsScreenSharing(false);
                setCameraEnabled(true);
            } catch (err) {
                console.warn("Reverting screen share failed:", err);
            }
        } else {
            // Start sharing
            try {
                const screenStream = await getScreenStream();
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                // Replace track on all active WebRTC peers
                for (const peer of Object.values(peersRef.current)) {
                    const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
                    if (sender) {
                        await sender.replaceTrack(screenTrack);
                    }
                }

                // Swap local tracks
                localStream.getVideoTracks().forEach(t => {
                    t.stop();
                    localStream.removeTrack(t);
                });
                localStream.addTrack(screenTrack);
                setLocalStream(new MediaStream(localStream.getTracks()));

                setIsScreenSharing(true);

                // Auto stop event handler
                screenTrack.onended = () => {
                    toggleScreenShare();
                };
            } catch (err) {
                console.warn("Screen share initiation failed:", err);
            }
        }
    };

    // Toggle local muting for remote participant card
    const toggleLocalMuteParticipant = (email) => {
        setLocallyMuted(prev => ({
            ...prev,
            [email]: !prev[email]
        }));
    };

    // Card Renderer for User Grid
    const renderParticipantCard = (pInfo, stream, isSelf) => {
        const initials = String(pInfo.name || "?").slice(0, 1).toUpperCase();
        const isMutedLocally = locallyMuted[pInfo.email];
        const isSpeaking = activeSpeaker === pInfo.email;
        const isAudioCall = activeGroupCall?.callType === "audio";

        // Check if camera is active
        const hasActiveVideo = !isAudioCall && stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

        return (
            <div
                key={pInfo.email}
                style={{
                    ...S.card,
                    ...(isSpeaking ? S.activeSpeakerCard : {}),
                }}
            >
                {/* Video Component */}
                {hasActiveVideo ? (
                    <video
                        ref={el => {
                            if (el && el.srcObject !== stream) {
                                el.srcObject = stream;
                            }
                        }}
                        autoPlay
                        playsInline
                        muted={isSelf || isMutedLocally}
                        style={S.video}
                    />
                ) : (
                    /* Avatar Fallback Component (similar to AudioCall or VideoCall Camera-Off) */
                    <div style={S.remoteAvatar}>
                        <div style={S.avatarCircle}>
                            {pInfo.photo ? (
                                <img
                                    src={pInfo.photo}
                                    alt={pInfo.name}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "50%",
                                        objectFit: "cover"
                                    }}
                                />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        <span style={{ color: "white", fontSize: "16px", fontWeight: 600, marginTop: "10px" }}>
                            {pInfo.name} {isSelf && "(You)"}
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                            {isAudioCall ? "Audio connected" : "Camera off"}
                        </span>
                    </div>
                )}

                {/* Local Mute Switch button overlay */}
                {!isSelf && (
                    <button
                        style={S.cardMuteBtn}
                        onClick={() => toggleLocalMuteParticipant(pInfo.email)}
                        title={isMutedLocally ? "Unmute participant locally" : "Mute participant locally"}
                    >
                        {isMutedLocally ? "🔇" : "🔊"}
                    </button>
                )}

                {/* Small overlay tag when video is active */}
                {hasActiveVideo && (
                    <div style={S.cardLabel}>
                        <span>{pInfo.name} {isSelf && "(You)"}</span>
                        {isSpeaking && <span style={{ color: "#10b981", fontSize: "11px" }}>● Speaking</span>}
                    </div>
                )}

                {/* Small indicator when voice is active but video is off */}
                {!hasActiveVideo && isSpeaking && (
                    <div style={{ ...S.cardLabel, bottom: "12px", left: "50%", transform: "translateX(-50%)" }}>
                        <span style={{ color: "#10b981" }}>● Speaking</span>
                    </div>
                )}
            </div>
        );
    };

    const allParticipantCards = [
        // Self
        renderParticipantCard(
            { email: user?.email, name: user?.name, photo: user?.photo },
            localStream,
            true
        ),
        // Remotes
        ...participants.map(p =>
            renderParticipantCard(p, remoteStreams[p.email], false)
        )
    ];

    const isVideoMode = activeGroupCall?.callType === "video";

    return (
        <div style={S.overlay}>
            {isScreenSharing && isVideoMode && (
                <div style={S.screenShareBadge}>📺 Screen Sharing</div>
            )}

            {/* Grid display Overlay */}
            <div style={S.gridContainer}>
                <div style={{ ...S.grid, ...getGridStyle(allParticipantCards.length) }}>
                    {allParticipantCards}
                </div>
            </div>

            {/* Bottom Controls Bar styled exactly like VideoCall/AudioCall */}
            <div style={S.controlBar}>
                <div style={S.infoRow}>
                    <span style={{ fontWeight: 700, fontSize: "16px", color: "white" }}>
                        {activeGroupCall?.groupName || "Group Call"}
                    </span>
                    <span style={{ fontSize: "13px", color: "#a0aec0" }}>
                        {isVideoMode ? "📹 Group Video Call" : "📞 Group Audio Call"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#a0aec0", marginTop: "2px" }}>
                        {participants.length + 1} participant{(participants.length + 1) !== 1 ? "s" : ""} connected
                    </span>
                    <div style={{ marginTop: "4px" }}>
                        <span style={S.timerText}>
                            <span>🔴</span>
                            <span>{formatTime(elapsedSeconds)}</span>
                        </span>
                    </div>
                </div>

                <div style={S.btnRow}>
                    {/* Mute */}
                    <button
                        style={S.btn(micEnabled === false, "#e53e3e")}
                        onClick={toggleMic}
                        title={micEnabled ? "Mute" : "Unmute"}
                    >
                        {micEnabled ? "🎤" : "🔇"}
                    </button>

                    {/* Camera Toggle */}
                    {isVideoMode && (
                        <button
                            style={S.btn(cameraEnabled === false, "#e53e3e")}
                            onClick={toggleCamera}
                            title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                        >
                            {cameraEnabled ? "📹" : "📷"}
                        </button>
                    )}

                    {/* Screen Share */}
                    {isVideoMode && (
                        <button
                            style={S.btn(isScreenSharing, "#6366f1")}
                            onClick={toggleScreenShare}
                            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                        >
                            🖥️
                        </button>
                    )}

                    {/* Leave Call */}
                    <button
                        style={S.endBtn}
                        onClick={handleLeave}
                        title="Leave Call"
                    >
                        📞
                    </button>
                </div>

                <div style={S.labelRow}>
                    <span style={S.label}>{micEnabled ? "Mute" : "Unmute"}</span>
                    {isVideoMode && (
                        <span style={S.label}>{cameraEnabled ? "Cam Off" : "Cam On"}</span>
                    )}
                    {isVideoMode && (
                        <span style={S.label}>{isScreenSharing ? "Stop Share" : "Share"}</span>
                    )}
                    <span style={S.endLabel}>Leave</span>
                </div>
            </div>
        </div>
    );
}
