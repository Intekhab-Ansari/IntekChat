// Automatic Cloud Signaling Fallback for Serverless Environments (Vercel)
// Connects peer-to-peer via free, reliable public WebSockets MQTT broker (EMQX / HiveMQ)
// Zero server setup required — devices discover each other instantly across the internet.

import mqtt from 'mqtt';

const PUBLIC_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

export class CloudSignalingAdapter {
  constructor(roomName, userProfile, options = {}) {
    this.roomName = (roomName || 'default-room').trim().toLowerCase().replace(/\s+/g, '-');
    this.userProfile = userProfile;
    this.options = options;
    this.client = null;
    this.listeners = new Map();
    this.knownPeers = new Map();
    this.heartbeatInterval = null;
    this.cleanupInterval = null;
    this.connected = false;
    this.selfId = userProfile.id;

    this.baseTopic = `intekchat/v3/rooms/${this.roomName}`;
    this.presenceTopic = `${this.baseTopic}/presence`;
    this.myDirectTopic = `${this.baseTopic}/peer/${this.selfId}`;

    this.init();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    return this;
  }

  emitLocal(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  init() {
    try {
      const brokerUrl = PUBLIC_BROKERS[0];
      const clientId = `intek_${this.selfId}_${Math.random().toString(16).slice(2, 8)}`;
      
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 5000,
        keepalive: 30
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.emitLocal('connect');

        // Subscribe to room presence and direct peer messages
        this.client.subscribe([this.presenceTopic, this.myDirectTopic], (err) => {
          if (!err) {
            // Announce presence to other peers in room
            this.broadcastPresence('announce');
            this.startHeartbeat();
          }
        });
      });

      this.client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          this.handleIncomingMessage(topic, data);
        } catch (err) {
          // Ignore invalid JSON payloads
        }
      });

      this.client.on('error', (err) => {
        console.warn('Cloud signaling broker warning:', err.message);
      });

      this.client.on('close', () => {
        this.connected = false;
      });

      // Cleanup stale peers that stopped heartbeating
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [peerId, peerData] of this.knownPeers.entries()) {
          if (now - peerData.lastSeen > 35000) {
            this.knownPeers.delete(peerId);
            this.emitLocal('peer-left', { id: peerId });
            this.broadcastCount();
          }
        }
      }, 10000);

      // Handle window unload / leave
      if (typeof window !== 'undefined') {
        this._unloadHandler = () => this.disconnect();
        window.addEventListener('beforeunload', this._unloadHandler);
      }
    } catch (err) {
      console.error('Failed to initialize cloud signaling adapter:', err);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.broadcastPresence('heartbeat');
      }
    }, 12000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  broadcastPresence(action) {
    if (!this.client || !this.connected) return;
    const msg = {
      action,
      senderId: this.selfId,
      peerInfo: this.userProfile,
      timestamp: Date.now()
    };
    this.client.publish(this.presenceTopic, JSON.stringify(msg));
  }

  broadcastCount() {
    const totalCount = this.knownPeers.size + 1;
    this.emitLocal('room-count-update', { totalCount });
  }

  handleIncomingMessage(topic, data) {
    const senderId = data.senderId || data.from;
    if (senderId === this.selfId) return; // Ignore own messages

    if (topic === this.presenceTopic) {
      if (data.action === 'announce') {
        // A new peer joined the room
        if (data.peerInfo) {
          const isNew = !this.knownPeers.has(data.peerInfo.id);
          this.knownPeers.set(data.peerInfo.id, {
            ...data.peerInfo,
            lastSeen: Date.now()
          });

          if (isNew) {
            this.emitLocal('peer-joined', data.peerInfo);
            this.broadcastCount();
          }

          // Welcome them and send back our peer info directly
          this.sendDirect(data.peerInfo.id, {
            type: 'welcome',
            senderId: this.selfId,
            peerInfo: this.userProfile
          });
        }
      } else if (data.action === 'heartbeat') {
        if (data.peerInfo) {
          const isNew = !this.knownPeers.has(data.peerInfo.id);
          this.knownPeers.set(data.peerInfo.id, {
            ...data.peerInfo,
            lastSeen: Date.now()
          });
          if (isNew) {
            this.emitLocal('peer-joined', data.peerInfo);
            this.broadcastCount();
          }
        }
      } else if (data.action === 'bye') {
        if (this.knownPeers.has(senderId)) {
          this.knownPeers.delete(senderId);
          this.emitLocal('peer-left', { id: senderId });
          this.broadcastCount();
        }
      }
    } else if (topic === this.myDirectTopic) {
      // Direct message sent to this specific peer
      if (data.type === 'welcome') {
        if (data.peerInfo) {
          const isNew = !this.knownPeers.has(data.peerInfo.id);
          this.knownPeers.set(data.peerInfo.id, {
            ...data.peerInfo,
            lastSeen: Date.now()
          });
          if (isNew) {
            this.emitLocal('peer-joined', data.peerInfo);
            this.broadcastCount();
          }
        }
      } else if (data.type === 'signal-offer') {
        this.emitLocal('signal-offer', {
          from: data.from,
          offer: data.offer,
          fromPeer: data.fromPeer
        });
      } else if (data.type === 'signal-answer') {
        this.emitLocal('signal-answer', {
          from: data.from,
          answer: data.answer
        });
      } else if (data.type === 'signal-ice-candidate') {
        this.emitLocal('signal-ice-candidate', {
          from: data.from,
          candidate: data.candidate
        });
      }
    }
  }

  sendDirect(targetPeerId, messageObj) {
    if (!this.client || !this.connected) return;
    const targetTopic = `${this.baseTopic}/peer/${targetPeerId}`;
    this.client.publish(targetTopic, JSON.stringify(messageObj));
  }

  // Socket.IO compatible emit method
  emit(event, data) {
    if (event === 'join-network') {
      // Re-announce presence
      this.broadcastPresence('announce');
      return;
    }

    if (event === 'signal-offer') {
      this.sendDirect(data.target, {
        type: 'signal-offer',
        from: this.selfId,
        offer: data.offer,
        fromPeer: this.userProfile
      });
      return;
    }

    if (event === 'signal-answer') {
      this.sendDirect(data.target, {
        type: 'signal-answer',
        from: this.selfId,
        answer: data.answer
      });
      return;
    }

    if (event === 'signal-ice-candidate') {
      this.sendDirect(data.target, {
        type: 'signal-ice-candidate',
        from: this.selfId,
        candidate: data.candidate
      });
      return;
    }

    if (event === 'leave-room') {
      this.broadcastPresence('bye');
      return;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (typeof window !== 'undefined' && this._unloadHandler) {
      window.removeEventListener('beforeunload', this._unloadHandler);
    }
    if (this.client) {
      try {
        this.broadcastPresence('bye');
        this.client.end(true);
      } catch (e) {}
      this.client = null;
    }
    this.connected = false;
  }
}
