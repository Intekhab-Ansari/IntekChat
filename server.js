const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active rooms and peers
// roomKey -> Map(socketId -> peerInfo)
const rooms = new Map();
// roomKey -> { passwordHash: string | null, isProtected: boolean, roomName: string, createdAt: number }
const roomsMeta = new Map();

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
  }
  return ip;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e8 // 100 MB max for fallback relay
  });

  io.on('connection', (socket) => {
    const rawIp = getClientIp(socket.request);
    let currentRoom = null;

    socket.on('join-network', ({ room, peerInfo, passwordHash }) => {
      // Leave previous room if already joined
      if (currentRoom && rooms.has(currentRoom)) {
        socket.leave(currentRoom);
        const prevPeers = rooms.get(currentRoom);
        prevPeers.delete(socket.id);
        if (prevPeers.size === 0) {
          rooms.delete(currentRoom);
          const meta = roomsMeta.get(currentRoom);
          if (meta) {
            meta.expiresAt = Date.now() + 30 * 60 * 1000;
          }
        } else {
          socket.to(currentRoom).emit('peer-left', { id: socket.id });
        }
      }

      const isCustomRoom = Boolean(room && room.trim().length > 0);
      const cleanRoom = isCustomRoom ? room.trim().toLowerCase().replace(/\s+/g, '-') : '';
      const targetRoom = isCustomRoom 
        ? `room:${cleanRoom}` 
        : `network:${rawIp}`;

      // Check room protection if it's a custom room
      if (isCustomRoom) {
        const existingMeta = roomsMeta.get(targetRoom);
        const isExpired = existingMeta && existingMeta.expiresAt && Date.now() > existingMeta.expiresAt;

        if (!existingMeta || isExpired) {
          // Creating this room: if passwordHash provided, protect it
          roomsMeta.set(targetRoom, {
            passwordHash: passwordHash || null,
            isProtected: Boolean(passwordHash),
            roomName: cleanRoom,
            createdAt: Date.now(),
            expiresAt: null
          });
        } else {
          // Room already exists: verify password
          if (existingMeta.isProtected) {
            if (!passwordHash || passwordHash !== existingMeta.passwordHash) {
              socket.emit('room-password-required', {
                room: cleanRoom,
                isProtected: true,
                reason: passwordHash ? 'Incorrect room password. Please try again.' : 'This room is password-protected. Enter password to unlock.',
                error: passwordHash ? 'Incorrect room password. Please try again.' : 'This room is password-protected. Enter password to unlock.'
              });
              return;
            }
          }
          existingMeta.expiresAt = null; // Active peer joined, clear expiration
        }
      }

      currentRoom = targetRoom;
      socket.join(targetRoom);

      if (!rooms.has(targetRoom)) {
        rooms.set(targetRoom, new Map());
      }

      const roomPeers = rooms.get(targetRoom);
      const peerData = {
        id: socket.id,
        name: peerInfo?.name || 'Anonymous Peer',
        deviceType: peerInfo?.deviceType || 'desktop',
        os: peerInfo?.os || 'unknown',
        avatar: peerInfo?.avatar || 'zap',
        isLocalNetwork: !isCustomRoom,
        joinedAt: Date.now()
      };

      const existingPeers = Array.from(roomPeers.values());
      const meta = isCustomRoom ? roomsMeta.get(targetRoom) : null;

      // Save peer to room map first
      roomPeers.set(socket.id, peerData);

      // Send list of current peers in this room to the joining socket (excluding themselves)
      socket.emit('room-peers', {
        room: targetRoom,
        roomName: cleanRoom,
        isProtected: meta?.isProtected || false,
        peers: existingPeers,
        totalCount: roomPeers.size,
        selfId: socket.id,
        networkType: peerData.isLocalNetwork ? 'Local Wi-Fi / LAN' : 'Custom Room'
      });

      // Notify others in room
      socket.to(targetRoom).emit('peer-joined', peerData);

      // Broadcast updated real-time participant count to everyone in the room
      io.to(targetRoom).emit('room-count-update', {
        room: cleanRoom,
        totalCount: roomPeers.size
      });
    });

    socket.on('leave-room', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        socket.leave(currentRoom);
        const prevPeers = rooms.get(currentRoom);
        prevPeers.delete(socket.id);
        if (prevPeers.size === 0) {
          rooms.delete(currentRoom);
          const meta = roomsMeta.get(currentRoom);
          if (meta) {
            meta.expiresAt = Date.now() + 30 * 60 * 1000;
          }
        } else {
          socket.to(currentRoom).emit('peer-left', { id: socket.id });
          io.to(currentRoom).emit('room-count-update', {
            totalCount: prevPeers.size
          });
        }
        currentRoom = null;
      }
    });

    // WebRTC Signaling Handshakes
    socket.on('signal-offer', ({ to, offer, fromPeer }) => {
      io.to(to).emit('signal-offer', {
        from: socket.id,
        offer,
        fromPeer
      });
    });

    socket.on('signal-answer', ({ to, answer }) => {
      io.to(to).emit('signal-answer', {
        from: socket.id,
        answer
      });
    });

    socket.on('signal-ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('signal-ice-candidate', {
        from: socket.id,
        candidate
      });
    });

    // E2EE fallback relay (if direct WebRTC P2P fails due to strict NAT/firewalls)
    socket.on('e2ee-relay', ({ to, payload, type }) => {
      if (to) {
        io.to(to).emit('e2ee-relay', {
          from: socket.id,
          payload,
          type
        });
      } else if (currentRoom) {
        socket.to(currentRoom).emit('e2ee-relay', {
          from: socket.id,
          payload,
          type
        });
      }
    });

    // Edit Room Details (Rename room, add/change/remove password)
    socket.on('edit-room', ({ oldRoom, newRoom, oldPasswordHash, newPasswordHash, isProtected }, callback) => {
      const cleanOld = (oldRoom || '').trim().toLowerCase();
      const cleanNew = (newRoom || '').trim().toLowerCase();

      if (!cleanOld || !cleanNew) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Both current and new room names are required.' });
        }
        return;
      }

      const oldKey = `room:${cleanOld}`;
      const newKey = `room:${cleanNew}`;
      const existingMeta = roomsMeta.get(oldKey);

      // Verify authorization if old room was password-protected
      if (existingMeta && existingMeta.isProtected) {
        if (!oldPasswordHash || oldPasswordHash !== existingMeta.passwordHash) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Incorrect existing password. Authorization failed.' });
          }
          return;
        }
      }

      // Check conflict if changing room name
      if (cleanNew !== cleanOld && roomsMeta.has(newKey)) {
        const targetMeta = roomsMeta.get(newKey);
        const targetPeers = rooms.get(newKey);
        if (targetMeta && targetPeers && targetPeers.size > 0) {
          if (typeof callback === 'function') {
            callback({ success: false, error: `Room #${cleanNew} is already occupied by other peers.` });
          }
          return;
        }
      }

      // Build updated metadata
      const updatedMeta = {
        passwordHash: isProtected ? newPasswordHash : null,
        isProtected: Boolean(isProtected && newPasswordHash),
        roomName: cleanNew,
        createdAt: existingMeta?.createdAt || Date.now(),
        expiresAt: null
      };

      // Remove old meta, set new meta
      roomsMeta.delete(oldKey);
      roomsMeta.set(newKey, updatedMeta);

      // Migrate active peers in socket room
      const oldPeersMap = rooms.get(oldKey) || new Map();
      rooms.delete(oldKey);
      rooms.set(newKey, oldPeersMap);

      // Move connected sockets from oldKey to newKey
      for (const [peerSocketId] of oldPeersMap.entries()) {
        const peerSocket = io.sockets.sockets.get(peerSocketId);
        if (peerSocket) {
          peerSocket.leave(oldKey);
          peerSocket.join(newKey);
        }
      }

      if (currentRoom === oldKey) {
        currentRoom = newKey;
      }

      // Broadcast room update to all peers in the room
      io.to(newKey).emit('room-details-updated', {
        oldRoom: cleanOld,
        newRoom: cleanNew,
        isProtected: updatedMeta.isProtected,
        message: `Room details updated: #${cleanOld} -> #${cleanNew}`
      });

      if (typeof callback === 'function') {
        callback({
          success: true,
          oldRoom: cleanOld,
          newRoom: cleanNew,
          isProtected: updatedMeta.isProtected
        });
      }
    });

    // Profile update (name, avatar)
    socket.on('update-profile', (updatedInfo) => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomPeers = rooms.get(currentRoom);
        if (roomPeers.has(socket.id)) {
          const peer = roomPeers.get(socket.id);
          Object.assign(peer, updatedInfo);
          socket.to(currentRoom).emit('peer-updated', peer);
        }
      }
    });

    socket.on('disconnect', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomPeers = rooms.get(currentRoom);
        roomPeers.delete(socket.id);
        if (roomPeers.size === 0) {
          rooms.delete(currentRoom);
          const meta = roomsMeta.get(currentRoom);
          if (meta) {
            meta.expiresAt = Date.now() + 30 * 60 * 1000;
          }
        } else {
          socket.to(currentRoom).emit('peer-left', { id: socket.id });
          io.to(currentRoom).emit('room-count-update', {
            totalCount: roomPeers.size
          });
        }
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> IntekChat Server running at http://localhost:${port}`);
  });
});
