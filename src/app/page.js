'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from '@/components/Navbar';
import RadarView from '@/components/IntekDrop/RadarView';
import ChatView from '@/components/IntekChat/ChatView';
import ProfileModal from '@/components/Modals/ProfileModal';
import QrModal from '@/components/Modals/QrModal';
import FileReceiveModal from '@/components/Modals/FileReceiveModal';
import RoomModal from '@/components/Modals/RoomModal';
import PasswordPromptModal from '@/components/Modals/PasswordPromptModal';
import { getOrCreatePeerProfile } from '@/lib/peer';
import { sounds } from '@/lib/sound';
import { deriveKey, encryptPayload, decryptPayload, hashPassword } from '@/lib/crypto';
import { WebRTCManager } from '@/lib/webrtc';

export default function Home() {
  const [activeTab, setActiveTab] = useState('drop'); // 'drop' | 'chat'
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [isRoomProtected, setIsRoomProtected] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState('');
  const [pendingRoom, setPendingRoom] = useState('');

  const [peers, setPeers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTransfers, setActiveTransfers] = useState({});
  const [receivedFileModal, setReceivedFileModal] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('sapphire'); // 'sapphire' | 'obsidian' | 'amethyst' | 'emerald'

  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const cancelTokensRef = useRef(new Set());

  // 1. Initialize Profile, Theme & URL Room Params
  useEffect(() => {
    const profile = getOrCreatePeerProfile();
    setUserProfile(profile);
    setSoundMuted(sounds.isMuted());

    if (typeof window !== 'undefined') {
      let savedTheme = localStorage.getItem('intekchat_theme') || 'sapphire';
      const validThemes = ['sapphire', 'frost', 'obsidian', 'amethyst', 'emerald'];
      if (!validThemes.includes(savedTheme)) {
        savedTheme = 'sapphire';
        localStorage.setItem('intekchat_theme', 'sapphire');
      }
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setRoomName(roomParam.trim());
        setActiveTab('chat');
      }
    }
  }, []);

  const handleSelectTheme = (themeName) => {
    setCurrentTheme(themeName);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_theme', themeName);
      document.documentElement.setAttribute('data-theme', themeName);
    }
  };

  // 2. Initialize E2EE Cryptographic Key whenever Room or Password Changes
  useEffect(() => {
    async function setupCrypto() {
      try {
        const secret = roomPassword 
          ? `${roomName || 'intekchat-local-wifi-default'}:${roomPassword}` 
          : (roomName || 'intekchat-local-wifi-default');
        const key = await deriveKey(secret);
        cryptoKeyRef.current = key;
      } catch (err) {
        console.error('Failed to derive encryption key:', err);
      }
    }
    setupCrypto();
  }, [roomName, roomPassword]);

  // 3. Connect to Signaling Server & WebRTC Manager
  useEffect(() => {
    if (!userProfile) return;

    // Connect to same origin
    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', async () => {
      // Join network / room with password hash if set
      let passwordHash = null;
      if (roomPassword) {
        try {
          passwordHash = await hashPassword(roomPassword);
        } catch (err) {
          console.error('Failed to hash room password:', err);
        }
      }
      socket.emit('join-network', {
        room: roomName,
        passwordHash,
        peerInfo: userProfile
      });
    });

    // Handle room password protection required from server
    socket.on('room-password-required', ({ room, isProtected, reason }) => {
      setIsRoomProtected(true);
      setPendingRoom(room);
      setPasswordPromptError(reason || 'This room is password-protected. Enter password to unlock.');
      setIsPasswordPromptOpen(true);
    });

    // Initialize WebRTC Manager
    const webrtc = new WebRTCManager(socket, userProfile, {
      onChannelOpen: (peerId) => {
        sounds.playJoin();
      },
      onFileTransferStart: (meta) => {
        setActiveTransfers((prev) => ({
          ...prev,
          [meta.id]: {
            id: meta.id,
            direction: 'receive',
            fileName: meta.name,
            totalBytes: meta.size,
            receivedBytes: 0,
            progress: 0,
            speed: 0,
            senderId: meta.senderId
          }
        }));
      },
      onTransferProgress: (progressData) => {
        setActiveTransfers((prev) => {
          if (!prev[progressData.id]) return prev;
          return {
            ...prev,
            [progressData.id]: {
              ...prev[progressData.id],
              ...progressData
            }
          };
        });
      },
      onFileTransferComplete: (completedFile) => {
        setActiveTransfers((prev) => {
          const next = { ...prev };
          delete next[completedFile.id];
          return next;
        });
        setReceivedFileModal(completedFile);
      },
      onFileTransferCancel: (transferId) => {
        setActiveTransfers((prev) => {
          const next = { ...prev };
          delete next[transferId];
          return next;
        });
      },
      onChatMessage: async (encryptedPayload, fromPeerId) => {
        const decrypted = await decryptPayload(encryptedPayload, cryptoKeyRef.current);
        if (decrypted) {
          sounds.playMessage();
          setMessages((prev) => [...prev, decrypted]);
        }
      },
      onChatClear: () => {
        sounds.playBurn();
        setMessages([]);
      },
      onViewOnceBurned: (messageId) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isBurned: true } : m))
        );
      }
    });
    webrtcRef.current = webrtc;

    // Socket Room Events
    socket.on('room-peers', ({ peers: initialPeers, selfId, isProtected }) => {
      if (typeof isProtected === 'boolean') {
        setIsRoomProtected(isProtected);
      }
      const filtered = initialPeers.filter((p) => p.id !== selfId);
      setPeers(filtered);
      // Auto-connect to existing peers
      filtered.forEach((p) => {
        webrtc.connectToPeer(p.id);
      });
    });

    socket.on('peer-joined', (newPeer) => {
      sounds.playJoin();
      setPeers((prev) => {
        if (prev.some((p) => p.id === newPeer.id)) return prev;
        return [...prev, newPeer];
      });
      webrtc.connectToPeer(newPeer.id);
    });

    socket.on('peer-updated', (updatedPeer) => {
      setPeers((prev) =>
        prev.map((p) => (p.id === updatedPeer.id ? updatedPeer : p))
      );
    });

    socket.on('peer-left', ({ id }) => {
      sounds.playLeave();
      setPeers((prev) => prev.filter((p) => p.id !== id));
      setActiveTransfers((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(next)) {
          if (val.senderId === id || val.peerId === id) delete next[key];
        }
        return next;
      });
    });

    // Fallback Encrypted Relay (in case direct WebRTC P2P channel is blocked)
    socket.on('e2ee-relay', async ({ from, payload, type }) => {
      if (type === 'chat') {
        const decrypted = await decryptPayload(payload, cryptoKeyRef.current);
        if (decrypted) {
          sounds.playMessage();
          setMessages((prev) => [...prev, decrypted]);
        }
      } else if (type === 'clear') {
        sounds.playBurn();
        setMessages([]);
      } else if (type === 'view-once-burned') {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.messageId ? { ...m, isBurned: true } : m))
        );
      }
    });

    return () => {
      webrtc.destroy();
      socket.disconnect();
    };
  }, [userProfile, roomName, roomPassword]);

  // Handle Profile Update
  const handleUpdateProfile = (updatedProfile) => {
    setUserProfile(updatedProfile);
    if (socketRef.current) {
      socketRef.current.emit('update-profile', updatedProfile);
    }
    if (webrtcRef.current) {
      webrtcRef.current.updateSelfPeer(updatedProfile);
    }
  };

  // Handle Joining / Creating Room
  const handleCreateOrJoinRoom = (newRoom, password = '') => {
    const cleanRoom = (newRoom || '').trim().toLowerCase();
    setRoomName(cleanRoom);
    setRoomPassword(password || '');
    setIsRoomProtected(!!password);
    setActiveTab('chat');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cleanRoom) {
        url.searchParams.set('room', cleanRoom);
      } else {
        url.searchParams.delete('room');
      }
      window.history.pushState({}, '', url.toString());
    }
    setMessages([]);
    sounds.playJoin();
  };

  const handleLeaveRoom = () => {
    setRoomName('');
    setRoomPassword('');
    setIsRoomProtected(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url.toString());
    }
    setMessages([]);
    sounds.playLeave();
  };

  const handlePasswordPromptSubmit = (enteredPassword) => {
    setPasswordPromptError('');
    setIsPasswordPromptOpen(false);
    setRoomPassword(enteredPassword);
    if (pendingRoom && pendingRoom !== roomName) {
      setRoomName(pendingRoom);
    }
  };

  const handlePasswordPromptCancel = () => {
    setIsPasswordPromptOpen(false);
    setPasswordPromptError('');
    setPendingRoom('');
    handleLeaveRoom();
  };

  // Send File in IntekDrop Tab
  const handleSendFile = async (peerId, file) => {
    if (!webrtcRef.current) return;

    const transferId = `send-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setActiveTransfers((prev) => ({
      ...prev,
      [transferId]: {
        id: transferId,
        peerId,
        direction: 'send',
        fileName: file.name,
        totalBytes: file.size,
        sentBytes: 0,
        progress: 0,
        speed: 0
      }
    }));

    try {
      await webrtcRef.current.sendFile(
        peerId,
        file,
        (progressData) => {
          setActiveTransfers((prev) => {
            if (!prev[transferId]) return prev;
            return {
              ...prev,
              [transferId]: {
                ...prev[transferId],
                ...progressData
              }
            };
          });
        },
        (id) => cancelTokensRef.current.has(id)
      );

      // Clean up on completion
      setTimeout(() => {
        setActiveTransfers((prev) => {
          const next = { ...prev };
          delete next[transferId];
          return next;
        });
      }, 1500);
    } catch (err) {
      console.error('File send error:', err);
      alert(`Could not send file: ${err.message}. Ensure peer connection is open.`);
      setActiveTransfers((prev) => {
        const next = { ...prev };
        delete next[transferId];
        return next;
      });
    }
  };

  const handleCancelTransfer = (transferId) => {
    cancelTokensRef.current.add(transferId);
    setActiveTransfers((prev) => {
      const next = { ...prev };
      delete next[transferId];
      return next;
    });
  };

  // Send Chat Message (E2EE)
  const handleSendMessage = async (msgData) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const fullMessage = {
      ...msgData,
      id: messageId,
      senderId: userProfile?.id || socketRef.current?.id,
      senderName: userProfile?.name || 'Anonymous',
      senderColor: userProfile?.colorIndex || 0,
      time,
      isBurned: false
    };

    // 1. Add plaintext directly to sender's view
    setMessages((prev) => [...prev, fullMessage]);

    // 2. Encrypt with AES-256-GCM before transmitting
    const encrypted = await encryptPayload(fullMessage, cryptoKeyRef.current);

    // 3. Send over WebRTC DataChannels first; fallback to socket relay if no open channel
    let channelsSent = 0;
    if (webrtcRef.current) {
      channelsSent = webrtcRef.current.broadcastChatMessage(encrypted);
    }

    if (channelsSent === 0 && socketRef.current) {
      // Fallback encrypted zero-knowledge socket relay
      socketRef.current.emit('e2ee-relay', {
        payload: encrypted,
        type: 'chat'
      });
    }
  };

  // Clear Chat (Dual Memory Wipe)
  const handleClearChat = () => {
    setMessages([]);
    sounds.playBurn();

    if (webrtcRef.current) {
      webrtcRef.current.broadcastClearChat();
    }
    if (socketRef.current) {
      socketRef.current.emit('e2ee-relay', {
        type: 'clear'
      });
    }
  };

  // Burn View-Once Image
  const handleBurnViewOnce = (messageId, senderId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isBurned: true } : m))
    );

    if (webrtcRef.current) {
      webrtcRef.current.sendViewOnceBurned(senderId, messageId);
    }
    if (socketRef.current) {
      socketRef.current.emit('e2ee-relay', {
        to: senderId,
        type: 'view-once-burned',
        payload: { messageId }
      });
    }
  };

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setSoundMuted(muted);
    if (!muted) sounds.playClick();
  };

  return (
    <div className="app-shell">
      {/* Top Cyber Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        roomName={roomName}
        peerCount={peers.length}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenQr={() => setIsQrModalOpen(true)}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        isRoomProtected={isRoomProtected}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'drop' ? (
          <RadarView
            peers={peers}
            userProfile={userProfile}
            onSendFile={handleSendFile}
            activeTransfers={activeTransfers}
            onCancelTransfer={handleCancelTransfer}
            onOpenQr={() => setIsQrModalOpen(true)}
            roomName={roomName}
          />
        ) : (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onBurnViewOnce={handleBurnViewOnce}
            roomName={roomName}
            peers={peers}
            peerCount={peers.length}
            userProfile={userProfile}
            onJoinRoom={handleCreateOrJoinRoom}
            isRoomProtected={isRoomProtected}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
          />
        )}
      </main>

      {/* Profile Customization Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* QR Code / Share Room Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        roomName={roomName}
      />

      {/* File Received Notification & Download Modal */}
      <FileReceiveModal
        fileData={receivedFileModal}
        onClose={() => setReceivedFileModal(null)}
      />

      {/* Room Manager Modal (Create Unique Room, Password Protection, Join & Leave) */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        currentRoom={roomName}
        isRoomProtected={isRoomProtected}
        onCreateRoom={handleCreateOrJoinRoom}
        onJoinRoom={handleCreateOrJoinRoom}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Password Prompt Modal for Unlocking Protected Rooms */}
      <PasswordPromptModal
        isOpen={isPasswordPromptOpen}
        roomName={pendingRoom || roomName}
        error={passwordPromptError}
        onSubmitPassword={handlePasswordPromptSubmit}
        onCancel={handlePasswordPromptCancel}
      />
    </div>
  );
}
