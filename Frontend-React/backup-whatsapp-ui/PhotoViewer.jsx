import { useEffect } from "react";

export default function PhotoViewer({
    photo,
    name,
    onClose
}) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!photo) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 99999
            }}
        >
            <div style={{ position: "relative", textAlign: "center" }}>
                {name && (
                    <div style={{
                        color: "white",
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "12px",
                        textShadow: "0 2px 4px rgba(0,0,0,0.8)"
                    }}>
                        {name}
                    </div>
                )}
                <img
                    onClick={(e) => e.stopPropagation()}
                    src={photo}
                    alt={name || "Profile Photo"}
                    style={{
                        maxWidth: "85vw",
                        maxHeight: "80vh",
                        borderRadius: "12px",
                        boxShadow: "0 0 30px rgba(0,0,0,.8)",
                        objectFit: "contain"
                    }}
                />
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "-40px",
                        right: "0px",
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        fontSize: "20px",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
