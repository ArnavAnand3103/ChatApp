# 💬 Project2 — Modern Real-Time Chat & WebRTC Communication Platform

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?logo=socketdotio&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

A feature-rich, high-performance real-time chat and collaboration application featuring **1-on-1 & Group Chats**, **WebRTC Peer-to-Peer Audio/Video Calling**, **AI Copilot & Image Generation**, **Document RAG**, **Google OAuth 2.0**, and **End-to-End Encryption (E2EE)** support.

---

## 🌟 Key Features

### 📨 Real-Time Messaging & Chat Experience
* **Instant Messaging**: Powered by low-latency WebSockets via Socket.io with live delivery and read receipts (double-blue checks).
* **Direct & Group Chats**: Seamless 1-on-1 private messaging and multi-member group channels with admin controls.
* **Rich Media Sharing**: Send photos, videos, voice notes, PDFs, spreadsheets, and documents.
* **Interactive Voice Notes**: In-chat audio recording with pause/resume controls, timer, and visual audio preview.
* **Live & Current Location**: In-chat location sharing integrated with interactive Leaflet map cards.
* **Message Actions**: Quoted replies, message forwarding, emoji reactions, message editing, starring, delete-for-me, and delete-for-everyone.
* **Presence & Activity**: Live online/offline status dots, dynamic active contact counter, last-seen timestamps, and typing indicators.
* **Chat Management**: Archive conversations, filter by Unread / Groups / Archived, and in-chat message search.

### 📞 WebRTC Audio & Video Calling
* **1-on-1 P2P Calling**: Crystal clear audio and HD video calls powered by WebRTC.
* **Group Calls**: Multi-user group voice and video conferences.
* **Screen Sharing**: One-click screen and application window sharing during calls.
* **Call Controls**: Camera flip / toggle, mute / unmute audio, call timer, and comprehensive call history logs.

### 🤖 Built-in AI Copilot
* **AI Chat Assistant**: High-speed conversational AI powered by Groq (Llama 3).
* **AI Image Generation**: Text-to-image synthesis powered by Hugging Face Diffusion models.
* **Document RAG**: Upload documents to perform context-aware semantic retrieval and conversational Q&A.

### 🔒 Security, Authentication & Backups
* **Google OAuth 2.0 & JWT**: One-tap Google Sign-In alongside standard Email/Password authentication with salted bcrypt hashing.
* **Signal Protocol E2EE**: Native End-to-End Encryption support powered by `@signalapp/libsignal-client` for desktop.
* **Encrypted Backups**: AES-encrypted chat backup and restore to local storage or S3-compatible cloud buckets.
* **Safety Controls**: Block and unblock users, report inappropriate accounts.

### 🎨 Modern Responsive Interface
* **Dual-Pane Desktop / Half-Tab View**: Resizes smoothly when snapping windows side-by-side without hiding the active conversation.
* **Mobile Single-Pane View**: Native-like mobile experience with one-tap back navigation.
* **Light & Dark Theme**: High-contrast, accessibility-friendly theme switching with instant persistence.
* **Chat Analytics Modal**: In-app glassmorphic dashboard tracking messages sent/received, platform stats, and network metrics.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Leaflet, React Leaflet, CSS3 Variables |
| **Backend** | Node.js, Express 5, Socket.io, Mongoose (MongoDB), Rate Limiter, CORS |
| **AI & ML** | Groq SDK (Llama 3), Hugging Face Inference API, Document Chunking & Embeddings |
| **Real-Time & Calling** | Socket.io WebSockets, WebRTC, MediaStreams API |
| **Security & Auth** | Google Auth Library, JSON Web Tokens (JWT), Bcrypt.js, Libsignal-client |
| **Storage & Cloud** | AWS S3 SDK (`@aws-sdk/client-s3`), Local File System Storage |
| **Desktop Wrapper** | Electron 40, Concurrently |

---

## 📂 Project Structure

```text
Project2/
├── Backend/                       # Node.js + Express API & Socket.io server
│   ├── ai/                        # AI Controllers, RAG services & prompt definitions
│   │   ├── controllers/
│   │   ├── prompts/
│   │   ├── routes/
│   │   └── services/              # Groq & Hugging Face integrations
│   ├── middelware/                # JWT Authentication middleware
│   ├── models/                    # Mongoose Schemas (User, Message, Group, Backup, etc.)
│   ├── services/                  # Backup encryption & storage services
│   ├── sockets/                   # WebRTC signaling & call sockets
│   ├── uploads/                   # Media & avatar upload directories
│   ├── .env.example               # Backend environment template
│   └── server.js                  # Main server entry point
├── Frontend-React/                # React 19 + Vite client application
│   ├── public/                    # Static assets, showcase imagery, frames
│   ├── src/
│   │   ├── components/            # Modals, Chat, Sidebar, Call controls, Profile avatars
│   │   ├── context/               # AuthContext, CallContext (WebRTC state)
│   │   ├── pages/                 # ChatPage, Login, Signup, Home, StarredMessages
│   │   ├── services/              # API clients, socket connections, WebRTC peer helpers
│   │   ├── utils/                 # Geolocation, browser notifications
│   │   ├── App.jsx                # Router & Provider configuration
│   │   └── chat.css               # Main application design & responsive breakpoints
│   ├── .env                       # Frontend client environment variables
│   └── vite.config.js             # Vite build configuration
├── desktop/                       # Electron desktop client & native crypto bridge
│   ├── electron-main.mjs
│   ├── preload.cjs
│   └── crypto-bridge.mjs
├── .gitignore                     # Repository ignore rules
└── package.json                   # Root scripts & shared dependencies
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **MongoDB**: Local MongoDB instance running on port `27017` or MongoDB Atlas connection string.

---

### 1. Clone the Repository

```bash
git clone https://github.com/ArnavAnand3103/ChatApp.git
cd ChatApp
```

---

### 2. Configure Environment Variables

#### Backend (`Backend/.env`)
Create a `.env` file inside the `Backend/` directory:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/chatapp
JWT_SECRET=your_jwt_secret_key_here

# Google OAuth 2.0 (Optional for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Features (Optional)
GROQ_API_KEY=your_groq_api_key_here
HF_TOKEN=your_huggingface_access_token_here

# Encrypted Backup Configuration
BACKUP_STORAGE=local
BACKUP_LOCAL_DIR=backups
BACKUP_ENCRYPTION_KEY=your_super_secret_backup_key_32_chars
```

#### Frontend (`Frontend-React/.env`)
Create a `.env` file inside the `Frontend-React/` directory:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

### 3. Install Dependencies

Install root and workspace dependencies:

```bash
# Install root & backend dependencies
npm install

# Install frontend dependencies
npm install --prefix Frontend-React
```

---

### 4. Run the Application

#### Option A: Run Full Stack (Backend + React Frontend)

**Terminal 1 (Backend Server - Port 5001):**
```bash
npm run dev
```

**Terminal 2 (Frontend Client - Port 5173):**
```bash
npm run dev --prefix Frontend-React
```

Open your browser and navigate to:
```text
http://localhost:5173/
```

#### Option B: Run as Desktop App (Electron)

```bash
npm run desktop:dev
```

---

## 📡 Core Socket.io Events

| Event Name | Direction | Description |
| :--- | :--- | :--- |
| `privateMessage` | Client $\rightarrow$ Server | Send private message to target user |
| `receiveMessage` | Server $\rightarrow$ Client | Deliver incoming message to sender & receiver |
| `groupMessage` | Client $\rightarrow$ Server | Broadcast message to group members |
| `receiveGroupMessage` | Server $\rightarrow$ Client | Deliver group message to participants |
| `typing` / `stopTyping` | Client $\rightarrow$ Server | Notify peer of typing activity |
| `onlineUsers` | Server $\rightarrow$ Client | Broadcast active user list updates |
| `webrtcSignal` | Bidirectional | WebRTC call SDP offers, answers, and ICE candidates |
| `messageStatus` | Server $\rightarrow$ Client | Updates message delivery state (`sent`, `delivered`, `seen`) |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **ISC License**. Feel free to use, modify, and distribute for personal or commercial projects.
