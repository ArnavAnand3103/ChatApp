import { useCall } from "../../context/CallContext";

export default function OutgoingCallModal({

    onEnd

}) {

    const {

        outgoingCall,

        callStatus

    } = useCall();

    if (

        !outgoingCall ||

        (callStatus !== "calling" && callStatus !== "connecting")

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
                    color: "white",
                    textAlign: "center"
                }}
            >

                <div
                    style={{
                        fontSize: "60px"
                    }}
                >
                    📞
                </div>

                <h2>Calling...</h2>

                <h3>{outgoingCall.toName || outgoingCall.to}</h3>

                <p
                    style={{
                        color: "#9ca3af"
                    }}
                >
                    {callStatus === "connecting" ? "Connecting..." : "Ringing..."}
                </p>

                <button
                    onClick={onEnd}
                    style={{
                        marginTop: "25px",
                        background: "#ff3b30",
                        color: "white",
                        border: "none",
                        padding: "12px 30px",
                        borderRadius: "999px",
                        cursor: "pointer"
                    }}
                >
                    End Call
                </button>

            </div>

        </div>

    );

}