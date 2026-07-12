import { useState } from "react";

export default function CallControls({
    muted,
    onToggleMute,
    onEnd,
    speakerOn,
    onToggleSpeaker
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                marginTop: "30px"
            }}
        >
            <div
                style={{
                    display: "flex",
                    gap: "24px",
                    justifyContent: "center"
                }}
            >
                {/* Mute Button */}
                <button
                    onClick={onToggleMute}
                    style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        border: "none",
                        background: muted ? "#e53e3e" : "#2d3748",
                        color: "white",
                        fontSize: "24px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        transition: "0.2s"
                    }}
                    title={muted ? "Unmute" : "Mute"}
                >
                    {muted ? "🔇" : "🎤"}
                </button>

                {/* Speaker Button */}
                <button
                    onClick={onToggleSpeaker}
                    style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        border: "none",
                        background: speakerOn ? "#3182ce" : "#2d3748",
                        color: "white",
                        fontSize: "24px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        transition: "0.2s"
                    }}
                    title={speakerOn ? "Speaker Off" : "Speaker On"}
                >
                    {speakerOn ? "🔊" : "🔈"}
                </button>

                {/* End Call Button */}
                <button
                    onClick={onEnd}
                    style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        border: "none",
                        background: "#ff3b30",
                        color: "white",
                        fontSize: "24px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        transition: "0.2s"
                    }}
                    title="End Call"
                >
                    📞
                </button>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: "40px",
                    fontSize: "13px",
                    color: "#a0aec0",
                    marginTop: "8px"
                }}
            >
                <span style={{ width: "70px", textAlign: "center" }}>{muted ? "Unmute" : "Mute"}</span>
                <span style={{ width: "70px", textAlign: "center" }}>Speaker</span>
                <span style={{ width: "70px", textAlign: "center" }}>End</span>
            </div>
        </div>
    );
}
