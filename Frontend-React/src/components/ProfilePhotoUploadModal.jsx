import { useEffect, useState } from "react";

export default function ProfilePhotoUploadModal({ file, onSave, onCancel }) {
    const [position, setPosition] = useState("50% 50%");
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(file, position);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onCancel} style={styles.overlay}>
            <section onClick={(event) => event.stopPropagation()} style={styles.modal}>
                <h2 style={{ marginTop: 0 }}>Preview Profile Photo</h2>
                <div style={styles.preview}>
                    <img src={previewUrl} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position }} />
                </div>
                <label style={{ display: "grid", gap: "8px", color: "#b9c3dc" }}>
                    Reposition
                    <input type="range" min="0" max="100" value={parseInt(position, 10)} onChange={(event) => setPosition(`${event.target.value}% 50%`)} />
                </label>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
                    <button onClick={onCancel} disabled={saving} style={styles.secondary}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={styles.primary}>{saving ? "Saving..." : "Save Photo"}</button>
                </div>
            </section>
        </div>
    );
}

const styles = {
    overlay: { position: "fixed", inset: 0, zIndex: 1000001, display: "grid", placeItems: "center", background: "rgba(4,8,24,.82)", padding: "18px" },
    modal: { width: "min(390px, 94vw)", padding: "24px", borderRadius: "18px", background: "#172746", color: "#f4f5ff", border: "1px solid rgba(133,164,220,.25)" },
    preview: { width: "220px", height: "220px", margin: "0 auto 20px", borderRadius: "50%", overflow: "hidden", background: "#21375b" },
    primary: { border: 0, borderRadius: "8px", padding: "10px 16px", background: "#5b62e8", color: "white", fontWeight: 700 },
    secondary: { border: "1px solid rgba(133,164,220,.3)", borderRadius: "8px", padding: "10px 16px", background: "transparent", color: "white" }
};
