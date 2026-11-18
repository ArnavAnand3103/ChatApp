import { useState } from "react";

export default function ProfileAvatar({ name, photo, size = 48, className = "" }) {
    const [imageFailed, setImageFailed] = useState(false);
    const label = String(name || "?").trim();
    const initials = label
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "?";

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                overflow: "hidden",
                background: "linear-gradient(135deg, #6d45e8, #8b5cf6)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: Math.max(14, Math.round(size * 0.38)),
                fontWeight: 700
            }}
        >
            {photo && !imageFailed ? (
                <img
                    src={photo}
                    alt={label}
                    onError={() => setImageFailed(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : (
                initials
            )}
        </div>
    );
}
