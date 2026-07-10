import React from 'react';
import reactDOM from 'react-dom/client';
import App from './App.jsx';
import {AuthProvider} from "./context/AuthContext.jsx";
import './chat.css';
import "leaflet/dist/leaflet.css";

reactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <AuthProvider>
            <App/>
        </AuthProvider>
    </React.StrictMode>
)