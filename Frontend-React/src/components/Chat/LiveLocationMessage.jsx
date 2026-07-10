import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapUpdater({ position }) {

    const map = useMap();

    useEffect(() => {

        map.flyTo(position, map.getZoom(), {
            animate: true,
            duration: 1
        });

    }, [position, map]);

    return null;

}

export default function LiveLocationMessage({  msg,
    stopLiveLocation,
    canStop }) {

  
    const [remaining, setRemaining] = useState(0);

useEffect(() => {

    const updateTimer = () => {

        const seconds = Math.max(
            0,
            Math.floor(
                (new Date(msg.expiresAt).getTime() - Date.now()) / 1000
            )
        );

        setRemaining(seconds);

    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);

}, [msg.expiresAt]);

 const minutes = Math.floor(remaining / 60);

const seconds = remaining % 60;

const position = [
    Number(msg.latitude),
    Number(msg.longitude)
];

    return (

        <div
           style={{
        width: "300px",
        background: "#202c33",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,.35)"
    }}
        >

       <MapContainer
    center={position}
    zoom={16}
    style={{
        height: "190px",
        width: "100%"
    }}
    dragging={false}
    zoomControl={false}
    scrollWheelZoom={false}
    attributionControl={false}
    doubleClickZoom={false}
    touchZoom={false}
>

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater position={position} />

               <Marker
    position={position}
/>

            </MapContainer>

            <div
                style={{
                    padding: "12px"
                }}
            >
<div
    style={{
        fontWeight: "600",
        color: "white"
    }}
>
    {msg.isLive
        ? "🌍 Live Location"
        : "📍 Live Location"}
</div>

               <div
    style={{
        color: "#9ca3af",
        marginTop: "4px",
        fontSize: "13px"
    }}
>
    {msg.isLive
        ? "Sharing live location"
        : "Shared live location"}
</div>

               {msg.isLive ? (

    <div
        style={{
            marginTop: "10px",
            color: "#25D366",
            fontWeight: "600"
        }}
    >
        <div
    style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "#25D366",
        color: "white",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: "600"
    }}
>
    <span
        style={{
            width: "8px",
            height: "8px",
            background: "white",
            borderRadius: "50%"
        }}
    />
    Live • {minutes}:{seconds.toString().padStart(2, "0")}
</div>
    </div>

) : (

    <div
        style={{
            marginTop: "10px",
            color: "#9ca3af",
            fontWeight: "600"
        }}
    >
        📍 Live Location Ended
    </div>

)}

        <a
    href={`https://maps.google.com/?q=${msg.latitude},${msg.longitude}`}
    target="_blank"
    rel="noreferrer"
    style={{
        display: "inline-block",
        marginTop: "12px",
        padding: "8px 14px",
        background: "#25D366",
        color: "white",
        textDecoration: "none",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "14px"
    }}
>
    Open in Google Maps
</a>
    {canStop && (
    <button
        onClick={stopLiveLocation}
        style={{
            marginTop: "12px",
            width: "100%",
            padding: "10px",
            border: "none",
            borderRadius: "8px",
            background: "#ff3b30",
            color: "white",
            cursor: "pointer",
            fontWeight: "600"
        }}
    >
        Stop Sharing
    </button>
)}

            </div>

        </div>

    );

}

