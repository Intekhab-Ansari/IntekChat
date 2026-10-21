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

    socket.on('join-network', ({ room, peerInfo }) => {
      // If room is not explicitly given, group by IP (Snapdrop style)
      const targetRoom = (room && room.trim().length > 0) 
        ? `room:${room.trim().toLowerCase()}` 
        : `network:${rawIp}`;

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
        isLocalNetwork: !room || room.trim().length === 0,
        joinedAt: Date.now()
      };

      // Send list of current peers in this room to the joining socket (excluding themselves)
      const existingPeers = Array.from(roomPeers.values());
      socket.emit('room-peers', {
        room: targetRoom,
        peers: existingPeers,
        selfId: socket.id,
        networkType: peerData.isLocalNetwork ? 'Local Wi-Fi / LAN' : 'Custom Room'
      });

      // Save peer to room map
      roomPeers.set(socket.id, peerData);

      // Notify others in room
      socket.to(targetRoom).emit('peer-joined', peerData);
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
        } else {
          socket.to(currentRoom).emit('peer-left', { id: socket.id });
        }
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> IntekChat Server running at http://localhost:${port}`);
  });
});
