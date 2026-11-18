import { useState } from "react";

export default function MediaModal({mediaUrl,type,onClose,fileName = "media",fileSize = 0,onDownload}){
    const [scale, setScale] = useState(1);
    if(!mediaUrl) return null;

    return (
        <div id="mediaZoomOverlay" className="active" onClick={onClose}>
             <button id="mediaZoomClose" aria-label="Close" onClick={onClose}>×</button>
             <div onClick={(e)=>e.stopPropagation()} style={{display: 'flex', flexDirection: "column", gap: "14px", justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%'}}>
                 {type === "image" ? (
                     <img id="mediaZoomImage" src={mediaUrl} alt="Zoomed media" style={{ maxWidth: "92vw", maxHeight: "76vh", objectFit: "contain", transform: `scale(${scale})`, transition: "transform .2s ease" }} />
                 ) : type === "pdf" ? (
                     <iframe src={mediaUrl} title="PDF preview" style={{ width: "min(900px, 92vw)", height: "78vh", border: 0, background: "white" }} />
                 ) : type === "document" ? (
                     <div style={{ width: "min(420px, 90vw)", padding: "28px", borderRadius: "14px", background: "#2b303b", color: "white", textAlign: "center" }}>
                         <div style={{ fontSize: "64px" }}>📄</div>
                         <div style={{ fontSize: "18px", fontWeight: 700, overflowWrap: "anywhere" }}>{fileName}</div>
                         {fileSize > 0 && <div style={{ color: "#aeb7c6", marginTop: "8px" }}>{formatFileSize(fileSize)}</div>}
                         <div style={{ color: "#aeb7c6", marginTop: "12px" }}>Preview is not available for this document type.</div>
                     </div>
                 ) : (
                     <video id="mediaZoomVideo" src={mediaUrl} controls />
                 )}
                 <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                     {type === "image" && (
                         <>
                             <button onClick={(event)=>{ event.stopPropagation(); setScale((value) => Math.min(3, value + .25)); }} style={controlStyle}>Zoom +</button>
                             <button onClick={(event)=>{ event.stopPropagation(); setScale(1); }} style={controlStyle}>Fit</button>
                             <button onClick={(event)=>{ event.stopPropagation(); setScale((value) => Math.max(.5, value - .25)); }} style={controlStyle}>Zoom -</button>
                         </>
                     )}
                     <button
                         onClick={(event)=>{ event.stopPropagation(); onDownload?.(); }}
                         style={controlStyle}
                     >
                         Download
                     </button>
                 </div>
             </div>
        </div>
    );
}

const controlStyle = {
    color: "white",
    background: "#2563eb",
    padding: "9px 14px",
    borderRadius: "8px",
    border: 0,
    cursor: "pointer"
};

const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};