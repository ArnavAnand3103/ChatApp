import { useEffect, useRef, useState, useCallback } from "react";
import { useCall } from "../../context/CallContext";
import CallTimer from "./CallTimer";

// ─────────────────────────────────────────────
// Inline styles (no external CSS dependency)
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
    },
    remoteWrapper: {
        flex: 1,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111118",
    },
    remoteVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    remoteAvatar: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        color: "white",
    },
    avatarCircle: {
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "linear-gradient(135deg,#5b21b6,#2563eb)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "52px",
    },
    localPreview: {
        position: "absolute",
        bottom: "120px",
        right: "20px",
        width: "140px",
        height: "200px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.3)",
        background: "#1e1e2e",
        cursor: "grab",
        zIndex: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        transition: "box-shadow 0.2s",
    },
    localVideo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "scaleX(-1)", // mirror local preview
    },
    localPlaceholder: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "#a0aec0",
        fontSize: "13px",
        gap: "8px",
    },
    controlBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 24px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
    },
    infoRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        color: "white",
        marginBottom: "4px",
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
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(99,102,241,0.9)",
        color: "white",
        padding: "6px 16px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 600,
        backdropFilter: "blur(8px)",
        zIndex: 20,
    },
};

// ─────────────────────────────────────────────
// VideoCall Component
// ─────────────────────────────────────────────
export default function VideoCall({ onEnd, onSwitchCamera, onToggleCamera, onScreenShare }) {

    const {
        callStatus,
        localStream,
        remoteStream,
        muted,
        setMuted,
        callStartedAt,
        callPartner,
        cameraEnabled,
        isScreenSharing,
    } = useCall();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const containerRef = useRef(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [previewPos, setPreviewPos] = useState({ bottom: 120, right: 20 });
    const dragOffset = useRef({ x: 0, y: 0 });

    // ── Attach local stream ──────────────────────────────────────────
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // ── Attach remote stream ─────────────────────────────────────────
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // ── Fullscreen change listener ───────────────────────────────────
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    // ── PiP change listener ──────────────────────────────────────────
    useEffect(() => {
        const video = remoteVideoRef.current;
        if (!video) return;
        const enter = () => setIsPiP(true);
        const leave = () => setIsPiP(false);
        video.addEventListener("enterpictureinpicture", enter);
        video.addEventListener("leavepictureinpicture", leave);
        return () => {
            video.removeEventListener("enterpictureinpicture", enter);
            video.removeEventListener("leavepictureinpicture", leave);
        };
    }, []);

    // ── Fullscreen toggle ────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(console.warn);
        } else {
            document.exitFullscreen().catch(console.warn);
        }
    }, []);

    // ── PiP toggle ───────────────────────────────────────────────────
    const togglePiP = useCallback(async () => {
        const video = remoteVideoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                if (!remoteStream) return;
                await video.requestPictureInPicture();
            }
        } catch (err) {
            console.warn("PiP error:", err);
        }
    }, [remoteStream]);

    // ── Draggable local preview ──────────────────────────────────────
    const onMouseDown = (e) => {
        setDragging(true);
        dragOffset.current = { x: e.clientX, y: e.clientY };
    };

    useEffect(() => {
        if (!dragging) return;
        const move = (e) => {
            const dx = dragOffset.current.x - e.clientX;
            const dy = dragOffset.current.y - e.clientY;
            dragOffset.current = { x: e.clientX, y: e.clientY };
            setPreviewPos(prev => ({
                right: Math.max(8, prev.right + dx),
                bottom: Math.max(8, prev.bottom + dy),
            }));
        };
        const up = () => setDragging(false);
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        return () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
    }, [dragging]);

    // ── Mute toggle ──────────────────────────────────────────────────
    const toggleMute = () => {
        const newMuted = !muted;
        localStream?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
        setMuted(newMuted);
    };

    if (callStatus !== "connected") return null;

    const hasRemoteVideo = remoteStream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");

    return (
        <div ref={containerRef} style={S.overlay}>

            {/* ── Remote Video / Avatar ── */}
            <div style={S.remoteWrapper}>

                {isScreenSharing && (
                    <div style={S.screenShareBadge}>📺 Screen Sharing</div>
                )}

                {hasRemoteVideo ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={S.remoteVideo}
                    />
                ) : (
                    <>
                        {/* keep the video element mounted for PiP / stream attach */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ display: "none" }}
                        />
                        <div style={S.remoteAvatar}>
                            <div style={S.avatarCircle}>👤</div>
                            <span style={{ color: "white", fontSize: "18px", fontWeight: 600 }}>
                                {callPartner?.name || "User"}
                            </span>
                            <span style={{ color: "#94a3b8", fontSize: "13px" }}>Camera off</span>
                        </div>
                    </>
                )}

                {/* ── Local Preview (draggable) ── */}
                <div
                    style={{
                        ...S.localPreview,
                        bottom: previewPos.bottom,
                        right: previewPos.right,
                        cursor: dragging ? "grabbing" : "grab",
                    }}
                    onMouseDown={onMouseDown}
                >
                    {cameraEnabled && localStream?.getVideoTracks().some(t => t.readyState === "live") ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={S.localVideo}
                        />
                    ) : (
                        <div style={S.localPlaceholder}>
                            <span style={{ fontSize: "32px" }}>📷</span>
                            <span>Camera off</span>
                        </div>
                    )}
                </div>

            </div>

            {/* ── Control Bar ── */}
            <div style={S.controlBar}>

                <div style={S.infoRow}>
                    <span style={{ fontWeight: 700, fontSize: "16px", color: "white" }}>
                        {callPartner?.name || "Video Call"}
                    </span>
                    <CallTimer startedAt={callStartedAt} />
                </div>

                <div style={S.btnRow}>

                    {/* Mute */}
                    <button
                        style={S.btn(muted, "#e53e3e")}
                        onClick={toggleMute}
                        title={muted ? "Unmute" : "Mute"}
                    >
                        {muted ? "🔇" : "🎤"}
                    </button>

                    {/* Camera Toggle */}
                    <button
                        style={S.btn(!cameraEnabled, "#e53e3e")}
                        onClick={onToggleCamera}
                        title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                    >
                        {cameraEnabled ? "📹" : "📷"}
                    </button>

                    {/* Switch Camera */}
                    <button
                        style={S.btn(false)}
                        onClick={onSwitchCamera}
                        title="Switch Camera"
                    >
                        🔄
                    </button>

                    {/* Screen Share */}
                    <button
                        style={S.btn(isScreenSharing, "#6366f1")}
                        onClick={onScreenShare}
                        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                    >
                        🖥️
                    </button>

                    {/* PiP */}
                    <button
                        style={S.btn(isPiP, "#0ea5e9")}
                        onClick={togglePiP}
                        title={isPiP ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
                    >
                        ⧉
                    </button>

                    {/* Fullscreen */}
                    <button
                        style={S.btn(isFullscreen, "#0ea5e9")}
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? "⤡" : "⤢"}
                    </button>

                    {/* End Call */}
                    <button
                        style={S.endBtn}
                        onClick={onEnd}
                        title="End Call"
                    >
                        📞
                    </button>

                </div>

                <div style={S.labelRow}>
                    <span style={S.label}>{muted ? "Unmute" : "Mute"}</span>
                    <span style={S.label}>{cameraEnabled ? "Cam Off" : "Cam On"}</span>
                    <span style={S.label}>Switch</span>
                    <span style={S.label}>{isScreenSharing ? "Stop Share" : "Share"}</span>
                    <span style={S.label}>PiP</span>
                    <span style={S.label}>{isFullscreen ? "Exit FS" : "Fullscr."}</span>
                    <span style={S.endLabel}>End</span>
                </div>

            </div>

        </div>
    );
}
