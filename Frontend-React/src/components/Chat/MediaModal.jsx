export default function MediaModal({mediaUrl,type,onClose}){
    if(!mediaUrl) return null;

    return (
        <div id="mediaZoomOverlay" className="active" onClick={onClose}>
             <button id="mediaZoomClose" aria-label="Close" onClick={onClose}>×</button>
             <div onClick={(e)=>e.stopPropagation()} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%'}}>
                 {type === "image" ? (
                     <img id="mediaZoomImage" src={mediaUrl} alt="Zoomed media" />
                 ) : (
                     <video id="mediaZoomVideo" src={mediaUrl} controls />
                 )}
             </div>
        </div>
    );
} 