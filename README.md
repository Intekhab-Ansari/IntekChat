# ⚡ IntekChat & IntekDrop

> **Next-Generation 2-in-1 Web Application**: High-Speed P2P File Sharing (like Snapdrop) & Anonymous End-to-End Encrypted Room Chat with Rich Media (like Klaklak) — **Zero Login. Zero Traces. Zero Server Logs.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_DataChannel-333333?style=flat&logo=webrtc)](https://webrtc.org/)
[![Encryption](https://img.shields.io/badge/Encryption-AES--256--GCM-blue?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
[![Socket.io](https://img.shields.io/badge/Signaling-Socket.io-010101?style=flat&logo=socket.io)](https://socket.io/)

---

## 🌟 Key Features

### 1. 📡 IntekDrop — Ultra High-Speed Local & Room File Sharing
* **Radar Sonar Interface**: Visualizes discovered devices on your local Wi-Fi or within your private disposable room.
* **Direct WebRTC P2P**: Bypasses cloud servers completely; transfers stream directly device-to-device at native LAN/Wi-Fi speeds.
* **Adaptive Flow Control**: 64KB chunk slicing with `bufferedAmountLowThreshold` backpressure management to prevent memory leaks during multi-gigabyte file transfers.
* **Universal File Support**: Send documents, 4K videos, APKs, archives (ZIP/RAR), and code without file size caps or compression.

### 2. 💬 IntekChat — Anonymous End-to-End Encrypted Room Chat
* **Zero Registration**: Jump straight in with an anonymous cyberpunk codename or custom handle.
* **Hardware-Accelerated Web Crypto API**: Every message and file is encrypted in your browser using `AES-256-GCM` with a 256-bit key derived via `PBKDF2` (100,000 iterations).
* **Media Privacy Modes**:
  * ⚡ **View Once**: Ephemeral photo with a 10-second self-destruct countdown timer and instant burn on closing.
  * 🔁 **Repeat**: Replayable during the active room session.
  * ♾️ **Permanent**: Persistent viewable photo in the current chat feed.
* **Stealth "Switch to Text" Mode**: Instantly hides photo previews and file cards into compact discreet text lines for privacy in public spaces.
* **Instant RAM Wipe ("Clear Chat")**: Destroys in-memory message logs in a single tap.

### 3. 🎨 Curated Multi-Theme System
Includes 5 handcrafted luxury dark themes selectable from the top navbar:
* 🌌 **Midnight Sapphire** (Default): Velvety obsidian slate with electric sapphire accents.
* ❄️ **Nordic Frost**: Deep titanium slate with arctic ice cyan luminescence.
* 🖤 **Obsidian Stealth**: Monochromatic carbon and titanium white minimalism.
* 🔮 **Royal Amethyst**: Velvet midnight indigo with celestial violet tones.
* ⚡ **Cyber Jade**: Onyx carbon with luminous electric mint-jade neon.

### 4. 🖼️ Chat Wallpaper & Pattern Engine
* **Curated Vector Patterns**: Cyber Doodles, Matrix Grid, Topographic Waves, Constellation, Cyber Honeycomb, and Midnight Aurora.
* **Custom Photo Upload**: Use any custom image as your chat backdrop.
* **Live Intensity & Blur Controls**: Adjust wallpaper opacity (6% to 75%) and enable background blur for optimal reading legibility.

---

## 🏗️ Architecture

```
                       [ Signaling Server (Socket.io) ]
                        (Room Discovery & ICE Handshake)
                                    /     \
                                   /       \
                          WebRTC SDP       WebRTC SDP
                                 /           \
                                v             v
      [ Peer A (Browser) ] <=====================> [ Peer B (Browser) ]
                               RTCDataChannel
                       (AES-256-GCM Direct Encrypted)
```

* **Signaling**: Coordinates peer discovery and WebRTC ICE candidate exchanges.
* **Payloads**: Never touch the server. Messages and files stream directly peer-to-peer.
* **Fallback**: Automatic client-side E2EE relay channel in case of symmetric NAT traversal limitations.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.17 or higher)
* `npm` or `yarn`

### Installation

```bash
# Clone the repository
git clone https://github.com/Intekhab-Ansari/IntekChat.git
cd IntekChat

# Install dependencies
npm install

# Start the unified dev server
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To test P2P file transfers and chatting locally:
1. Open a second tab or an Incognito window at `http://localhost:3000/?room=test-room`.
2. Both tabs will instantly discover each other.

---

## 🔒 Security & Privacy Notice
* IntekChat uses the standard W3C Web Crypto API (`crypto.subtle`) for encryption key derivation and ciphertext authentication.
* No chat logs, contact lists, or file payloads are persisted in any server database.

---

## 📄 License
MIT License. Free for personal and commercial open-source use.
