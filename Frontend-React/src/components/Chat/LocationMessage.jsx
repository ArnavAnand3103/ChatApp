import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function LocationMessage({ msg }) {

    const lat = Number(msg?.latitude);
    const lng = Number(msg?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {

        console.error("Invalid location message:", msg);

        return (
            <div
                style={{
                    padding: "12px",
                    color: "white",
                    background: "#202c33",
                    borderRadius: "12px"
                }}
            >
                📍 Invalid Location
            </div>
        );

    }

    const position = [lat, lng];

    return (

        <div
            style={{
                width: "100%",
                background: "#202c33",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 14px rgba(0,0,0,.35)"
            }}
        >

            <div
                style={{
                    padding: "8px"
                }}
            >

                <MapContainer
                    center={position}
                    zoom={16}
                    style={{
                        width: "100%",
                        height: "170px",
                        borderRadius: "12px"
                    }}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    zoomControl={false}
                    attributionControl={false}
                >

                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker position={position} />

                </MapContainer>

            </div>

            <div
                style={{
                    padding: "12px 14px"
                }}
            >

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "15px"
                    }}
                >
                    📍 Current Location
                </div>

                <div
                    style={{
                        color: "#9ca3af",
                        fontSize: "13px",
                        marginTop: "4px"
                    }}
                >
                    Shared current location
                </div>

                <a
                    href={`https://maps.google.com/?q=${lat},${lng}`}
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

            </div>

        </div>

    );

}