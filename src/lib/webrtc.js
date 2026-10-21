// High-Speed WebRTC P2P DataChannel Engine with Adaptive Backpressure & Flow Control
import { sounds } from './sound';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// 64 KB chunk size: Optimal for modern browser WebRTC engines
const CHUNK_SIZE = 64 * 1024;
// Thresholds for flow control to saturate bandwidth without buffer overflow
const BUFFERED_AMOUNT_LOW_THRESHOLD = 64 * 1024; // 64 KB
const BUFFERED_AMOUNT_MAX = 256 * 1024; // 256 KB

export class WebRTCManager {
  constructor(socket, selfPeerInfo, callbacks = {}) {
    this.socket = socket;
    this.selfPeer = selfPeerInfo;
    this.callbacks = callbacks;
    // remoteSocketId -> RTCPeerConnection
    this.peers = new Map();
    // remoteSocketId -> RTCDataChannel
    this.channels = new Map();
    // fileTransferId -> { meta, chunks: [], receivedBytes: 0, startTime: number }
    this.incomingFiles = new Map();

    this.setupSignaling();
  }

  updateSelfPeer(updated) {
    this.selfPeer = updated;
  }

  setupSignaling() {
    if (!this.socket) return;

    this.socket.on('signal-offer', async ({ from, offer, fromPeer }) => {
      await this.handleOffer(from, offer, fromPeer);
    });

    this.socket.on('signal-answer', async ({ from, answer }) => {
      await this.handleAnswer(from, answer);
    });

    this.socket.on('signal-ice-candidate', async ({ from, candidate }) => {
      await this.handleIceCandidate(from, candidate);
    });

    this.socket.on('peer-left', ({ id }) => {
      this.closePeer(id);
    });
  }

  getOrCreatePeer(remoteId) {
    if (this.peers.has(remoteId)) {
      return this.peers.get(remoteId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(remoteId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('signal-ice-candidate', {
          to: remoteId,
          candidate: event.candidate
        });
      }
    };

    pc.ondatachannel = (event) => {
      this.setupChannel(remoteId, event.channel);
    };

    pc.onconnectionstatechange = () => {
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(remoteId, pc.connectionState);
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(remoteId);
      }
    };

    return pc;
  }

  setupChannel(remoteId, channel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;
    this.channels.set(remoteId, channel);

    channel.onopen = () => {
      if (this.callbacks.onChannelOpen) {
        this.callbacks.onChannelOpen(remoteId);
      }
    };

    channel.onclose = () => {
      if (this.callbacks.onChannelClose) {
        this.callbacks.onChannelClose(remoteId);
      }
      this.channels.delete(remoteId);
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(remoteId, event.data);
    };
  }

  // Connect to a remote peer (caller initiates offer)
  async connectToPeer(remoteId) {
    try {
      const pc = this.getOrCreatePeer(remoteId);
      const channel = pc.createDataChannel('intek-channel', { ordered: true });
      this.setupChannel(remoteId, channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('signal-offer', {
        to: remoteId,
        offer,
        fromPeer: this.selfPeer
      });
    } catch (err) {
      console.error('Failed to create offer for peer:', remoteId, err);
    }
  }

  async handleOffer(from, offer, fromPeer) {
    try {
      const pc = this.getOrCreatePeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('signal-answer', {
        to: from,
        answer
      });
    } catch (err) {
      console.error('Failed to handle offer from:', from, err);
    }
  }

  async handleAnswer(from, answer) {
    try {
      const pc = this.peers.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error('Failed to handle answer from:', from, err);
    }
  }

  async handleIceCandidate(from, candidate) {
    try {
      const pc = this.peers.get(from);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  }

  // Handle incoming data channel packets (JSON control or binary chunks)
  handleIncomingData(fromPeerId, data) {
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        this.handleControlMessage(fromPeerId, message);
      } catch (err) {
        console.error('Failed to parse text message:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      this.handleBinaryChunk(fromPeerId, data);
    }
  }

  handleControlMessage(fromPeerId, msg) {
    switch (msg.type) {
      case 'file-meta': {
        // Incoming file header
        this.incomingFiles.set(msg.id, {
          id: msg.id,
          name: msg.name,
          size: msg.size,
          mimeType: msg.mimeType,
          totalChunks: msg.totalChunks,
          senderId: fromPeerId,
          senderName: msg.senderName,
          chunks: [],
          receivedBytes: 0,
          startTime: Date.now(),
          lastTelemetryTime: Date.now(),
          lastTelemetryBytes: 0
        });

        sounds.playTransferStart();

        if (this.callbacks.onFileTransferStart) {
          this.callbacks.onFileTransferStart(msg);
        }
        break;
      }

      case 'file-done': {
        const fileRecord = this.incomingFiles.get(msg.id);
        if (fileRecord) {
          const blob = new Blob(fileRecord.chunks, {
            type: fileRecord.mimeType || 'application/octet-stream'
          });
          const url = URL.createObjectURL(blob);

          sounds.playTransferComplete();

          if (this.callbacks.onFileTransferComplete) {
            this.callbacks.onFileTransferComplete({
              id: fileRecord.id,
              name: fileRecord.name,
              size: fileRecord.size,
              mimeType: fileRecord.mimeType,
              blob,
              url,
              senderId: fromPeerId,
              senderName: fileRecord.senderName
            });
          }

          this.incomingFiles.delete(msg.id);
        }
        break;
      }

      case 'file-cancel': {
        if (this.incomingFiles.has(msg.id)) {
          this.incomingFiles.delete(msg.id);
          if (this.callbacks.onFileTransferCancel) {
            this.callbacks.onFileTransferCancel(msg.id);
          }
        }
        break;
      }

      case 'chat-message': {
        if (this.callbacks.onChatMessage) {
          this.callbacks.onChatMessage(msg.payload, fromPeerId);
        }
        break;
      }

      case 'chat-clear': {
        if (this.callbacks.onChatClear) {
          this.callbacks.onChatClear(fromPeerId);
        }
        break;
      }

      case 'view-once-burned': {
        if (this.callbacks.onViewOnceBurned) {
          this.callbacks.onViewOnceBurned(msg.messageId);
        }
        break;
      }

      default:
        break;
    }
  }

  handleBinaryChunk(fromPeerId, buffer) {
    // Determine active incoming transfer for this peer
    let activeRecord = null;
    for (const record of this.incomingFiles.values()) {
      if (record.senderId === fromPeerId) {
        activeRecord = record;
        break;
      }
    }

    if (!activeRecord) return;

    activeRecord.chunks.push(buffer);
    activeRecord.receivedBytes += buffer.byteLength;

    const now = Date.now();
    // Fire progress updates at most every 150ms
    if (now - activeRecord.lastTelemetryTime > 150 || activeRecord.receivedBytes >= activeRecord.size) {
      const timeDelta = (now - activeRecord.lastTelemetryTime) / 1000;
      const bytesDelta = activeRecord.receivedBytes - activeRecord.lastTelemetryBytes;
      const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0; // Bytes/sec

      activeRecord.lastTelemetryTime = now;
      activeRecord.lastTelemetryBytes = activeRecord.receivedBytes;

      const progress = Math.min(100, Math.round((activeRecord.receivedBytes / activeRecord.size) * 100));

      if (this.callbacks.onTransferProgress) {
        this.callbacks.onTransferProgress({
          id: activeRecord.id,
          direction: 'receive',
          receivedBytes: activeRecord.receivedBytes,
          totalBytes: activeRecord.size,
          progress,
          speed,
          fileName: activeRecord.name
        });
      }
    }
  }

  // Ultra-Fast File Sending with Adaptive Backpressure & Buffer Monitoring
  async sendFile(remoteId, file, onProgress, onCancelCheck) {
    const channel = this.channels.get(remoteId);
    if (!channel || channel.readyState !== 'open') {
      throw new Error('Peer connection data channel is not open');
    }

    const transferId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Send file metadata header
    const meta = {
      type: 'file-meta',
      id: transferId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      totalChunks,
      senderName: this.selfPeer?.name || 'Peer'
    };

    channel.send(JSON.stringify(meta));
    sounds.playTransferStart();

    // 2. Stream binary slices with backpressure flow control
    let offset = 0;
    let sentBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    const waitForBufferDrain = () => {
      return new Promise((resolve) => {
        if (channel.bufferedAmount <= BUFFERED_AMOUNT_LOW_THRESHOLD) {
          resolve();
        } else {
          const listener = () => {
            channel.removeEventListener('bufferedamountlow', listener);
            resolve();
          };
          channel.addEventListener('bufferedamountlow', listener);
        }
      });
    };

    while (offset < file.size) {
      if (onCancelCheck && onCancelCheck(transferId)) {
        channel.send(JSON.stringify({ type: 'file-cancel', id: transferId }));
        return { cancelled: true };
      }

      // Check backpressure
      if (channel.bufferedAmount > BUFFERED_AMOUNT_MAX) {
        await waitForBufferDrain();
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();

      channel.send(buffer);
      offset += CHUNK_SIZE;
      sentBytes += buffer.byteLength;

      const now = Date.now();
      if (now - lastTime > 150 || sentBytes >= file.size) {
        const timeDelta = (now - lastTime) / 1000;
        const bytesDelta = sentBytes - lastBytes;
        const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;

        lastTime = now;
        lastBytes = sentBytes;

        const progress = Math.min(100, Math.round((sentBytes / file.size) * 100));

        if (onProgress) {
          onProgress({
            id: transferId,
            direction: 'send',
            sentBytes,
            totalBytes: file.size,
            progress,
            speed,
            fileName: file.name
          });
        }
      }
    }

    // Wait until last buffered bytes leave the socket
    if (channel.bufferedAmount > 0) {
      await waitForBufferDrain();
    }

    // 3. Send completion packet
    channel.send(JSON.stringify({ type: 'file-done', id: transferId }));
    sounds.playTransferComplete();

    return { success: true, transferId };
  }

  // Send Direct Encrypted Chat Message or Control Packet
  sendChatMessage(remoteId, payload) {
    const channel = this.channels.get(remoteId);
    if (channel && channel.readyState === 'open') {
      channel.send(
        JSON.stringify({
          type: 'chat-message',
          payload
        })
      );
      return true;
    }
    return false;
  }

  // Broadcast to all open channels in room
  broadcastChatMessage(payload) {
    let sentCount = 0;
    for (const [peerId, channel] of this.channels.entries()) {
      if (channel && channel.readyState === 'open') {
        channel.send(
          JSON.stringify({
            type: 'chat-message',
            payload
          })
        );
        sentCount++;
      }
    }
    return sentCount;
  }

  // Broadcast Clear Chat command
  broadcastClearChat() {
    for (const channel of this.channels.values()) {
      if (channel && channel.readyState === 'open') {
        channel.send(JSON.stringify({ type: 'chat-clear' }));
      }
    }
  }

  // Notify sender that a View Once image was burned
  sendViewOnceBurned(senderId, messageId) {
    const channel = this.channels.get(senderId);
    if (channel && channel.readyState === 'open') {
      channel.send(
        JSON.stringify({
          type: 'view-once-burned',
          messageId
        })
      );
    }
  }

  closePeer(remoteId) {
    if (this.channels.has(remoteId)) {
      try {
        this.channels.get(remoteId).close();
      } catch {}
      this.channels.delete(remoteId);
    }
    if (this.peers.has(remoteId)) {
      try {
        this.peers.get(remoteId).close();
      } catch {}
      this.peers.delete(remoteId);
    }
  }

  destroy() {
    for (const peerId of this.peers.keys()) {
      this.closePeer(peerId);
    }
    this.incomingFiles.clear();
  }
}
