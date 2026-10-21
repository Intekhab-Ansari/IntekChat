'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Radio, X, AlertTriangle } from 'lucide-react';
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
  const [totalParticipants, setTotalParticipants] = useState(1);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomModalInitialTab, setRoomModalInitialTab] = useState('create');
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
  const [currentTheme, setCurrentTheme] = useState('sapphire'); // 'sapphire' | 'silk' | 'cyberpunk' | 'amber' | 'amethyst' | 'emerald' | 'obsidian' | 'frost'
  const [signalingError, setSignalingError] = useState(false);
  const [dismissSignalingBanner, setDismissSignalingBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('intekchat_dismiss_signal') === 'true';
    }
    return false;
  });

  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const cancelTokensRef = useRef(new Set());

  // 1. Initialize Profile, Theme & URL Room Params (including 1-scan QR auto join)
  useEffect(() => {
    const profile = getOrCreatePeerProfile();
    setUserProfile(profile);
    setSoundMuted(sounds.isMuted());

    if (typeof window !== 'undefined') {
      let savedTheme = localStorage.getItem('intekchat_theme') || 'sapphire';
      const validThemes = ['sapphire', 'silk', 'cyberpunk', 'amber', 'amethyst', 'emerald', 'obsidian', 'frost'];
      if (!validThemes.includes(savedTheme)) {
        savedTheme = 'sapphire';
        localStorage.setItem('intekchat_theme', 'sapphire');
      }
      setCurrentTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const pwdParam = params.get('pwd') || params.get('pass') || params.get('password');
      let hashPwd = '';
      if (window.location.hash) {
        const hashMatch = window.location.hash.match(/(?:#|&)pwd=([^&]+)/);
        if (hashMatch) hashPwd = decodeURIComponent(hashMatch[1]);
      }
      const initialPwd = (pwdParam || hashPwd || '').trim();

      if (roomParam) {
        const cleanRoom = roomParam.trim().toLowerCase().replace(/\s+/g, '-');
        setRoomName(cleanRoom);
        if (initialPwd) {
          setRoomPassword(initialPwd);
          setIsRoomProtected(true);
        }
        setActiveTab('chat');
        // Clean URL address bar if room name had spaces
        if (roomParam !== cleanRoom) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', cleanRoom);
            window.history.replaceState({}, '', url.toString());
          } catch {}
        }
      }
      const tabParam = params.get('tab');
      if (tabParam === 'chat' || tabParam === 'drop') {
        setActiveTab(tabParam);
      } else if (window.location.hash === '#chat') {
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

    // Connect to signaling server (supports custom backend when deployed on serverless hosts like Vercel)
    let customServerUrl = undefined;
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('intekchat_signaling_url');
      if (storedUrl) customServerUrl = storedUrl;
      else if (process.env.NEXT_PUBLIC_SIGNALING_SERVER) customServerUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER;
    }

    const socket = io(customServerUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on('connect', async () => {
      setSignalingError(false);
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

    socket.on('connect_error', (err) => {
      setSignalingError(true);
    });

    socket.on('disconnect', () => {
      setSignalingError(true);
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
    socket.on('room-peers', ({ peers: initialPeers, selfId, isProtected, totalCount }) => {
      if (typeof isProtected === 'boolean') {
        setIsRoomProtected(isProtected);
      }
      const filtered = initialPeers.filter((p) => p.id !== selfId);
      setPeers(filtered);
      setTotalParticipants(typeof totalCount === 'number' ? totalCount : filtered.length + 1);
      // Auto-connect to existing peers
      filtered.forEach((p) => {
        webrtc.connectToPeer(p.id);
      });
    });

    socket.on('room-count-update', ({ totalCount }) => {
      if (typeof totalCount === 'number') {
        setTotalParticipants(totalCount);
      }
    });

    socket.on('peer-joined', (newPeer) => {
      sounds.playJoin();
      setPeers((prev) => {
        if (prev.some((p) => p.id === newPeer.id)) return prev;
        const next = [...prev, newPeer];
        setTotalParticipants(next.length + 1);
        return next;
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
      setPeers((prev) => {
        const next = prev.filter((p) => p.id !== id);
        setTotalParticipants(Math.max(1, next.length + 1));
        return next;
      });
      setActiveTransfers((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(next)) {
          if (val.senderId === id || val.peerId === id) delete next[key];
        }
        return next;
      });
    });

    // Room Details Updated by Host (Renamed or password changed/removed)
    socket.on('room-details-updated', ({ oldRoom, newRoom, isProtected, message }) => {
      sounds.playSuccess();
      setRoomName(newRoom);
      setIsRoomProtected(isProtected);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', newRoom);
        window.history.pushState({}, '', url.toString());
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          system: true,
          text: message || `Room details were updated to #${newRoom}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
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

  const handleOpenRoomModal = (tab = null) => {
    setRoomModalInitialTab(tab || (roomName ? 'edit' : 'create'));
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = () => {
    setRoomModalInitialTab('edit');
    setIsRoomModalOpen(true);
  };

  // Handle Joining / Creating Room
  const handleCreateOrJoinRoom = (newRoom, password = '') => {
    const cleanRoom = (newRoom || '').trim().toLowerCase().replace(/\s+/g, '-');
    setRoomName(cleanRoom);
    setRoomPassword(password || '');
    setIsRoomProtected(!!password);
    setTotalParticipants(1);
    setActiveTab('chat');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cleanRoom) {
        url.searchParams.set('room', cleanRoom);
        if (password) {
          url.searchParams.set('pwd', password);
        } else {
          url.searchParams.delete('pwd');
        }
      } else {
        url.searchParams.delete('room');
        url.searchParams.delete('pwd');
      }
      window.history.pushState({}, '', url.toString());
    }
    setMessages([]);
    sounds.playJoin();
  };

  // Handle Editing Room Details (Rename, Add Password, Change Password, or Remove Password)
  const handleEditRoom = async ({ oldRoom, newRoom, currentPassword, newPassword, isRemovingPassword }) => {
    if (!socketRef.current) throw new Error('Not connected to signaling server');

    const effectiveOldPass = currentPassword || roomPassword || null;
    let oldPasswordHash = null;
    if (effectiveOldPass) {
      oldPasswordHash = await hashPassword(effectiveOldPass);
    }

    const isProtected = Boolean(!isRemovingPassword && (newPassword || (isRoomProtected && !isRemovingPassword)));
    let newPasswordHash = null;
    if (newPassword && !isRemovingPassword) {
      newPasswordHash = await hashPassword(newPassword);
    } else if (isProtected && effectiveOldPass) {
      newPasswordHash = oldPasswordHash;
    }

    return new Promise((resolve) => {
      socketRef.current.emit(
        'edit-room',
        {
          oldRoom,
          newRoom,
          oldPasswordHash,
          newPasswordHash,
          isProtected
        },
        (res) => {
          if (res && res.success) {
            const cleanNew = res.newRoom;
            setRoomName(cleanNew);
            setIsRoomProtected(res.isProtected);
            if (isRemovingPassword) {
              setRoomPassword('');
            } else if (newPassword) {
              setRoomPassword(newPassword);
            }

            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('room', cleanNew);
              window.history.pushState({}, '', url.toString());
            }

            setMessages((prev) => [
              ...prev,
              {
                id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                system: true,
                text: `Room details updated to #${cleanNew} (${res.isProtected ? 'Password Protected 🔒' : 'Open E2EE 🔓'})`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
            sounds.playSuccess();
            resolve({ success: true, newRoom: cleanNew });
          } else {
            resolve({ success: false, error: res?.error || 'Failed to update room.' });
          }
        }
      );
    });
  };

  const handleLeaveRoom = () => {
    setRoomName('');
    setRoomPassword('');
    setIsRoomProtected(false);
    setTotalParticipants(1);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      url.searchParams.delete('pwd');
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
        totalParticipants={totalParticipants}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenQr={() => setIsQrModalOpen(true)}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        isRoomProtected={isRoomProtected}
        onOpenRoomModal={() => handleOpenRoomModal()}
      />

      {/* Signaling Server Offline Banner for Vercel Serverless Hosting */}
      {signalingError && !dismissSignalingBanner && (
        <div className="signaling-status-banner">
          <div className="signaling-banner-left">
            <Radio size={14} className="text-amber animate-pulse flex-shrink-0" />
            <span>
              <strong>WebSockets Offline on Vercel:</strong> Test via local Wi-Fi: <code>http://192.168.1.132:3000</code> or deploy on Render.
            </span>
          </div>
          <div className="signaling-banner-actions">
            <button 
              type="button" 
              className="btn-close-signaling-banner"
              onClick={() => {
                setDismissSignalingBanner(true);
                try { sessionStorage.setItem('intekchat_dismiss_signal', 'true'); } catch {}
              }}
              aria-label="Dismiss banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

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
            roomPassword={roomPassword}
            peers={peers}
            peerCount={peers.length}
            totalParticipants={totalParticipants}
            userProfile={userProfile}
            onJoinRoom={handleCreateOrJoinRoom}
            isRoomProtected={isRoomProtected}
            onOpenRoomModal={() => handleOpenRoomModal()}
            onOpenEditRoom={handleOpenEditRoom}
            onOpenProfile={() => setIsProfileModalOpen(true)}
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
        roomPassword={roomPassword}
        isRoomProtected={isRoomProtected}
      />

      {/* File Received Notification & Download Modal */}
      <FileReceiveModal
        fileData={receivedFileModal}
        onClose={() => setReceivedFileModal(null)}
      />

      {/* Room Manager Modal (Create Unique Room, Password Protection, Join, Edit & Leave) */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        currentRoom={roomName}
        roomPassword={roomPassword}
        isRoomProtected={isRoomProtected}
        onCreateRoom={handleCreateOrJoinRoom}
        onJoinRoom={handleCreateOrJoinRoom}
        onLeaveRoom={handleLeaveRoom}
        onEditRoom={handleEditRoom}
        initialTab={roomModalInitialTab}
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
