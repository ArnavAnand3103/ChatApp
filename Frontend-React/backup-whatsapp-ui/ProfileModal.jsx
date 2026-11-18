import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, uploadProfilePhoto, deleteProfilePhoto } from '../services/api';

export default function ProfileModal({ onClose, onOpenPhotoViewer }) {
    const { user, token, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || "");
    const [about, setAbout] = useState(user?.about || "Hey there! I am using WhatsApp.");
    const [phone, setPhone] = useState(user?.phone || "");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const fileInputRef = useRef(null);

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const photoData = String(reader.result || "");
            setLoading(true);
            try {
                const res = await uploadProfilePhoto(token, photoData);
                if (res?.user) {
                    updateUser(res.user);
                    setMsg("Profile photo updated successfully!");
                } else {
                    alert(res?.message || "Failed to upload photo");
                }
            } catch (err) {
                alert("Upload failed: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeletePhoto = async () => {
        if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
        setLoading(true);
        try {
            const res = await deleteProfilePhoto(token);
            if (res?.user) {
                updateUser(res.user);
                setMsg("Profile photo removed!");
            } else {
                alert(res?.message || "Failed to remove photo");
            }
        } catch (err) {
            alert("Error removing photo: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) {
            alert("Name must be at least 2 characters");
            return;
        }
        setLoading(true);
        try {
            const res = await updateProfile(token, { name, about, phone });
            if (res?.user) {
                updateUser(res.user);
                setMsg("Profile updated successfully!");
                setTimeout(() => {
                    onClose();
                }, 1000);
            } else {
                alert(res?.message || "Update failed");
            }
        } catch (err) {
            alert("Error updating profile: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const initials = (name || "?").slice(0, 2).toUpperCase();

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 20, 26, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: "#111b21",
                color: "#e9edef",
                borderRadius: "14px",
                width: "90%",
                maxWidth: "430px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                border: "1px solid rgba(134,150,160,0.15)",
                overflow: "hidden"
            }} onClick={(e) => e.stopPropagation()}>
                
                {/* WhatsApp Web Green Header Bar */}
                <div style={{
                    background: "#008069",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "white"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "17px", fontWeight: "600" }}>
                        <span>👤</span>
                        <span>Profile</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            fontSize: "18px",
                            cursor: "pointer",
                            padding: "4px"
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: "24px" }}>
                    {msg && (
                        <div style={{
                            background: "rgba(0,168,132,0.2)",
                            border: "1px solid #00a884",
                            color: "#00a884",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            textAlign: "center",
                            marginBottom: "16px",
                            fontWeight: "500"
                        }}>
                            {msg}
                        </div>
                    )}

                    {/* WhatsApp Style Avatar with Hover Overlay */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "22px" }}>
                        <div 
                            onClick={() => user?.photo && onOpenPhotoViewer && onOpenPhotoViewer(user.photo, user.name)}
                            style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "50%",
                                background: "#202c33",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "38px",
                                fontWeight: "bold",
                                overflow: "hidden",
                                cursor: user?.photo ? "pointer" : "default",
                                border: "3px solid #00a884",
                                position: "relative",
                                marginBottom: "14px"
                            }}
                            title={user?.photo ? "Click to view full screen" : ""}
                        >
                            {user?.photo ? (
                                <img src={user.photo} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : initials}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    background: "#00a884",
                                    color: "#111b21",
                                    border: "none",
                                    padding: "6px 14px",
                                    borderRadius: "18px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                📷 Change Photo
                            </button>
                            {user?.photo && (
                                <button 
                                    type="button"
                                    onClick={handleDeletePhoto}
                                    style={{
                                        background: "transparent",
                                        color: "#f87171",
                                        border: "1px solid rgba(239,68,68,0.4)",
                                        padding: "6px 12px",
                                        borderRadius: "18px",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        fontWeight: "600"
                                    }}
                                >
                                    🗑️ Remove
                                </button>
                            )}
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/*" 
                                style={{ display: "none" }} 
                                onChange={handlePhotoUpload} 
                            />
                        </div>
                    </div>

                    {/* WhatsApp Style Form Fields */}
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", color: "#00a884", fontWeight: "600", marginBottom: "4px" }}>
                                YOUR NAME
                            </label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(134,150,160,0.25)",
                                    background: "#202c33",
                                    color: "#e9edef",
                                    fontSize: "14px",
                                    outline: "none"
                                }} 
                            />
                            <span style={{ fontSize: "11px", color: "#8696a0", marginTop: "4px", display: "block" }}>
                                This is visible to your WhatsApp contacts.
                            </span>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", color: "#00a884", fontWeight: "600", marginBottom: "4px" }}>
                                ABOUT
                            </label>
                            <input 
                                type="text"
                                value={about} 
                                onChange={(e) => setAbout(e.target.value)}
                                placeholder="Hey there! I am using WhatsApp."
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(134,150,160,0.25)",
                                    background: "#202c33",
                                    color: "#e9edef",
                                    fontSize: "14px",
                                    outline: "none"
                                }} 
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", color: "#00a884", fontWeight: "600", marginBottom: "4px" }}>
                                PHONE NUMBER
                            </label>
                            <input 
                                type="tel" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(134,150,160,0.25)",
                                    background: "#202c33",
                                    color: "#e9edef",
                                    fontSize: "14px",
                                    outline: "none"
                                }} 
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", color: "#8696a0", marginBottom: "4px" }}>
                                REGISTERED EMAIL
                            </label>
                            <input 
                                type="text" 
                                value={user?.email || ""} 
                                disabled 
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(134,150,160,0.1)",
                                    background: "rgba(255,255,255,0.03)",
                                    color: "#8696a0",
                                    fontSize: "14px"
                                }} 
                            />
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                            <button 
                                type="button" 
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "20px",
                                    border: "1px solid rgba(134,150,160,0.3)",
                                    background: "transparent",
                                    color: "#e9edef",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                    fontSize: "14px"
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "20px",
                                    border: "none",
                                    background: "#00a884",
                                    color: "#111b21",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontWeight: "600",
                                    fontSize: "14px"
                                }}
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
