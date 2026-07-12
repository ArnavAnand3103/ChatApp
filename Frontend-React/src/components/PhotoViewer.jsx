import {useEffect} from "react";

export default function PhotoViewer({
    photo,
    name,
    onClose
}){
useEffect(()=>{
    const handler=(e)=>{
        if(e.key==="Escape"){
            onClose();
        }
    };
   
},[onClose]);
    if(!photo) return null;

    return(
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
            <img
            onClick={(e)=>e.stopPropagation()}
            src={photo}
            alt={name}
            style={{
                maxWidth: "80vw",
                maxHeight: "80vh",
                borderRadius: "12px",
                boxShadow: "0 0 25px rgba(0,0,0,.6)",
                transform: "scale(1)",
                transition: "all .25s ease"
            }}
            />
           </div>
    )
}