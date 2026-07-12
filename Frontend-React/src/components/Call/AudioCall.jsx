import { useState } from "react";
import { useCall } from "../../context/CallContext";
import CallTimer from "./CallTimer";
import CallControls from "./CallControls";

export default function AudioCall({
    onEnd,
    selectedUser
}) {

    const {
        callStatus,
        muted,
        setMuted,
        localStream,
        callStartedAt
    } = useCall();

    const [speakerOn, setSpeakerOn] = useState(false);

    if (callStatus !== "connected") return null;

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#111",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999999
            }}
        >

            <div
                style={{
                    width: "180px",
                    height: "180px",
                    borderRadius: "50%",
                    background: "#2d3748",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "70px",
                    marginBottom: "25px"
                }}
            >
                👤
            </div>

            <h2
                style={{
                    margin: 0
                }}
            >
                {selectedUser?.name || "Unknown User"}
            </h2>

            <p
                style={{
                    color: "#25D366",
                    marginTop: "10px",
                    marginBottom: "10px"
                }}
            >
                Connected
            </p>

            <h3
                style={{
                    marginBottom: "10px"
                }}
            >
                📞 Audio Call
            </h3>

            <CallTimer startedAt={callStartedAt} />

            <CallControls
                muted={muted}
                onToggleMute={() => {
                    const newMuted = !muted;
                    localStream?.getAudioTracks().forEach(track => {
                        track.enabled = !newMuted;
                    });
                    setMuted(newMuted);
                }}
                onEnd={onEnd}
                speakerOn={speakerOn}
                onToggleSpeaker={() => setSpeakerOn(!speakerOn)}
            />

        </div>

    );

}