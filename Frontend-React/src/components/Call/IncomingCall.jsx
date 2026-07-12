import { useCall } from "../../context/CallContext";

export default function IncomingCallModal({

    onAccept,

    onReject

}) {

    const {

        incomingCall,

        callStatus

    } = useCall();

    if (

        !incomingCall ||

        (callStatus !== "ringing" && callStatus !== "connecting")

    ) return null;

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 999999
            }}
        >

            <div
                style={{
                    width: "340px",
                    background: "#202c33",
                    borderRadius: "18px",
                    padding: "28px",
                    textAlign: "center",
                    color: "white",
                    boxShadow: "0 15px 40px rgba(0,0,0,.45)"
                }}
            >

                <div
                    style={{
                        fontSize: "60px"
                    }}
                >
                    {incomingCall.callType === "video" ? "🎥" : "📞"}
                </div>

                <h2
                    style={{
                        marginTop: "15px"
                    }}
                >
                    Incoming {incomingCall.callType === "video" ? "Video" : "Audio"} Call
                </h2>

                <h3
                    style={{
                        marginTop: "12px"
                    }}
                >
                    {incomingCall.fromName || incomingCall.from}
                </h3>

                <p
                    style={{
                        color: "#b0b0b0",
                        marginTop: "10px"
                    }}
                >
                    {callStatus === "connecting" ? "Connecting..." : "Calling..."}
                </p>

                <div
                    style={{
                        marginTop: "30px",
                        display: "flex",
                        justifyContent: "space-around"
                    }}
                >

                    <button
                        onClick={onReject}
                        style={{
                            width: "120px",
                            padding: "12px",
                            borderRadius: "999px",
                            border: "none",
                            background: "#ff3b30",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "600"
                        }}
                    >
                        Reject
                    </button>

                    <button
                        onClick={onAccept}
                        style={{
                            width: "120px",
                            padding: "12px",
                            borderRadius: "999px",
                            border: "none",
                            background: "#25D366",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: "600"
                        }}
                    >
                        Accept
                    </button>

                </div>

            </div>

        </div>

    );

}