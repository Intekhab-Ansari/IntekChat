'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Navbar from '@/components/Navbar';
import RadarView from '@/components/IntekDrop/RadarView';
import ChatView from '@/components/IntekChat/ChatView';
import ProfileModal from '@/components/Modals/ProfileModal';
import QrModal from '@/components/Modals/QrModal';
import FileReceiveModal from '@/components/Modals/FileReceiveModal';
import RoomModal from '@/components/Modals/RoomModal';
import PasswordPromptModal from '@/components/Modals/PasswordPromptModal';
import WallpaperModal from '@/components/Modals/WallpaperModal';
import { getOrCreatePeerProfile } from '@/lib/peer';
import { sounds } from '@/lib/sound';
import { deriveKey, encryptPayload, decryptPayload, hashPassword } from '@/lib/crypto';
import { WebRTCManager } from '@/lib/webrtc';
import { CloudSignalingAdapter } from '@/lib/cloudSignaling';
import { compressWallpaperImage } from '@/lib/wallpapers';

const getRoomStorageKey = (rName) => {
  const clean = (rName || 'lobby').trim().toLowerCase().replace(/\s+/g, '-');
  return `intekchat_room_msgs_${clean}`;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('drop'); // 'drop' | 'chat'
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [isRoomProtected, setIsRoomProtected] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(1);
  const [dropPairId, setDropPairId] = useState('');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomModalInitialTab, setRoomModalInitialTab] = useState('create');
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState('');
  const [pendingRoom, setPendingRoom] = useState('');

  const [peers, setPeers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [syncedWallpaper, setSyncedWallpaper] = useState(null);
  const [activeTransfers, setActiveTransfers] = useState({});
  const [receivedFileModal, setReceivedFileModal] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalMode, setQrModalMode] = useState('show');
  const [soundMuted, setSoundMuted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('sapphire'); // 'sapphire' | 'silk' | 'cyberpunk' | 'amber' | 'amethyst' | 'emerald' | 'obsidian' | 'frost'
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [appearanceInitialTab, setAppearanceInitialTab] = useState('theme');
  const [wallpaperType, setWallpaperType] = useState('doodles');
  const [customWallpaper, setCustomWallpaper] = useState(null);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(18);
  const [wallpaperBlur, setWallpaperBlur] = useState(false);

  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const cancelTokensRef = useRef(new Set());
  const relayIncomingFilesRef = useRef(new Map());
  const syncedWallpaperRef = useRef(null);
  const messagesRef = useRef([]);
  const roomNameRef = useRef('');
  const currentThemeRef = useRef('sapphire');
  const wallpaperSettingsRef = useRef({
    wallpaperType: 'doodles',
    customWallpaper: null,
    wallpaperOpacity: 18,
    wallpaperBlur: false
  });
  const sendQueueRef = useRef([]);
  const isSendingFileRef = useRef(false);

  useEffect(() => {
    syncedWallpaperRef.current = syncedWallpaper;
  }, [syncedWallpaper]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    roomNameRef.current = roomName;
  }, [roomName]);

  useEffect(() => {
    currentThemeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    wallpaperSettingsRef.current = {
      wallpaperType,
      customWallpaper,
      wallpaperOpacity,
      wallpaperBlur
    };
  }, [wallpaperType, customWallpaper, wallpaperOpacity, wallpaperBlur]);

  // Handle mobile visual viewport & virtual keyboard sticking (WhatsApp-like layout)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateVisualViewport = () => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      const keyboardHeight = Math.max(0, window.innerHeight - height);
      const isKeyboardOpen = keyboardHeight > 100;

      document.documentElement.style.setProperty('--visual-viewport-height', `${height}px`);
      document.documentElement.style.setProperty('--visual-viewport-top', `${offsetTop}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);

      document.documentElement.classList.toggle('keyboard-open', isKeyboardOpen);
      document.body.classList.toggle('keyboard-open', isKeyboardOpen);

      // Lock window scroll at 0, 0 to prevent mobile browser rubber-banding/shifting
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    updateVisualViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVisualViewport);
      window.visualViewport.addEventListener('scroll', updateVisualViewport);
    }
    window.addEventListener('resize', updateVisualViewport);
    window.addEventListener('orientationchange', updateVisualViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateVisualViewport);
        window.visualViewport.removeEventListener('scroll', updateVisualViewport);
      }
      window.removeEventListener('resize', updateVisualViewport);
      window.removeEventListener('orientationchange', updateVisualViewport);
    };
  }, []);

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

      // Load saved wallpaper settings
      const savedWallType = localStorage.getItem('intekchat_wallpaper_type');
      if (savedWallType !== null) setWallpaperType(savedWallType);
      const savedCustom = localStorage.getItem('intekchat_wallpaper_custom');
      if (savedCustom) setCustomWallpaper(savedCustom);
      const savedOpacity = localStorage.getItem('intekchat_wallpaper_opacity');
      if (savedOpacity) setWallpaperOpacity(Number(savedOpacity));
      const savedBlur = localStorage.getItem('intekchat_wallpaper_blur');
      if (savedBlur !== null) setWallpaperBlur(savedBlur === 'true');

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const pairParam = params.get('pair');
      const pwdParam = params.get('pwd') || params.get('pass') || params.get('password');
      let hashPwd = '';
      if (window.location.hash) {
        const hashMatch = window.location.hash.match(/(?:#|&)pwd=([^&]+)/);
        if (hashMatch) hashPwd = decodeURIComponent(hashMatch[1]);
      }
      const initialPwd = (pwdParam || hashPwd || '').trim();

      if (pairParam) {
        const cleanPair = pairParam.trim().toLowerCase();
        setDropPairId(cleanPair);
        setRoomName(cleanPair);
        setActiveTab('drop');
      } else if (roomParam) {
        const cleanRoom = roomParam.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setRoomName(cleanRoom);
        setDropPairId(cleanRoom);
        if (initialPwd) {
          setRoomPassword(initialPwd);
          setIsRoomProtected(true);
        }
        setActiveTab('chat');
        if (roomParam !== cleanRoom) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', cleanRoom);
            url.searchParams.set('tab', 'chat');
            window.history.replaceState({}, '', url.toString());
          } catch {}
        }
      } else {
        setDropPairId('');
        setRoomName('');
      }

      const tabParam = params.get('tab');
      if (tabParam === 'chat' || tabParam === 'drop') {
        setActiveTab(tabParam);
      } else if (pairParam) {
        setActiveTab('drop');
      } else if (roomParam) {
        setActiveTab('chat');
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

  const handleSelectWallpaper = (type) => {
    setWallpaperType(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_type', type);
    }
  };

  const handleUploadCustomWallpaper = (dataUrl) => {
    setCustomWallpaper(dataUrl);
    setWallpaperType('custom');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('intekchat_wallpaper_custom', dataUrl);
        localStorage.setItem('intekchat_wallpaper_type', 'custom');
      } catch (e) {
        console.warn('LocalStorage save custom wallpaper error:', e);
      }
    }
  };

  const handleClearCustomWallpaper = () => {
    setCustomWallpaper(null);
    setWallpaperType('none');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('intekchat_wallpaper_custom');
      localStorage.setItem('intekchat_wallpaper_type', 'none');
    }
  };

  const handleChangeWallpaperOpacity = (val) => {
    setWallpaperOpacity(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_opacity', String(val));
    }
  };

  const handleToggleWallpaperBlur = (val) => {
    setWallpaperBlur(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_blur', String(val));
    }
  };

  const handleOpenAppearance = (tab = 'theme') => {
    sounds.playClick();
    setAppearanceInitialTab(tab);
    setIsAppearanceModalOpen(true);
  };

  // Seamless Tab Switcher: Keeps P2P & Chat connected, syncs browser URL state
  const handleSwitchTab = (newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', newTab);
        if (newTab === 'drop') {
          // When switching to IntekDrop, clean room/pwd so address bar shows clean P2P pairing
          url.searchParams.delete('room');
          url.searchParams.delete('pwd');
          if (dropPairId) {
            url.searchParams.set('pair', dropPairId);
          } else {
            url.searchParams.delete('pair');
          }
        } else {
          // When switching to IntekChat, clean pair so address bar reflects chat room
          url.searchParams.delete('pair');
          if (roomName) {
            url.searchParams.set('room', roomName);
            if (isRoomProtected && roomPassword) {
              url.searchParams.set('pwd', roomPassword);
            }
          } else {
            url.searchParams.delete('room');
            url.searchParams.delete('pwd');
          }
        }
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        console.warn('Failed to update URL on tab switch:', err);
      }
    }
  };

  // Restore room messages from localStorage on mount or room change (preserves chat on refresh)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = getRoomStorageKey(roomName);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to restore messages from localStorage:', e);
    }
  }, [roomName]);

  // Persist messages in localStorage until user explicitly clears chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = getRoomStorageKey(roomName);
    try {
      if (!messages || messages.length === 0) return;
      // Strip out large dataUrls (> 400KB) to prevent localStorage quota errors
      const sanitized = messages.slice(-250).map((m) => {
        if (m.dataUrl && m.dataUrl.length > 400000) {
          return { ...m, dataUrl: '' };
        }
        return m;
      });
      localStorage.setItem(storageKey, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('Failed to save messages to localStorage:', e);
    }
  }, [messages, roomName]);

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

  // Incoming typing status handler
  const handleIncomingTyping = useCallback(({ isTyping, senderId, senderName }) => {
    if (!senderId || senderId === userProfile?.id) return;
    setTypingUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== senderId);
      if (isTyping) {
        return [...filtered, { id: senderId, name: senderName || 'Peer', timestamp: Date.now() }];
      }
      return filtered;
    });
  }, [userProfile?.id]);

  // Incoming message seen receipt handler
  const handleIncomingMessageSeen = useCallback(({ messageIds, readerId, readerName }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((msg) => {
        if (messageIds.includes(msg.id)) {
          changed = true;
          const currentSeenBy = msg.seenBy || [];
          const newSeenBy = readerName && !currentSeenBy.includes(readerName)
            ? [...currentSeenBy, readerName]
            : currentSeenBy;
          return { ...msg, seen: true, seenBy: newSeenBy };
        }
        return msg;
      });
      return changed ? next : prev;
    });
  }, []);

  // Incoming room wallpaper sync handler
  const handleIncomingRoomWallpaper = useCallback((wallpaperPayload) => {
    if (!wallpaperPayload) return;
    setSyncedWallpaper((prev) => {
      // Deduplicate if already applied this exact sync event
      if (
        prev &&
        prev.timestamp &&
        wallpaperPayload.timestamp &&
        prev.timestamp === wallpaperPayload.timestamp &&
        prev.senderId === wallpaperPayload.senderId
      ) {
        return prev;
      }
      sounds.playSuccess();
      const wallTitle = wallpaperPayload.wallpaperType === 'custom'
        ? 'Custom Photo'
        : (wallpaperPayload.wallpaperType === 'none' ? 'Clean Solid' : wallpaperPayload.wallpaperType || 'Preset');

      // Do not duplicate if this is our own broadcast echoed back
      if (userProfile?.id && wallpaperPayload.senderId === userProfile.id) {
        return wallpaperPayload;
      }

      if (wallpaperPayload.wallpaperType) {
        setWallpaperType(wallpaperPayload.wallpaperType);
      }
      if (wallpaperPayload.customImage !== undefined) {
        setCustomWallpaper(wallpaperPayload.customImage);
      }
      if (typeof wallpaperPayload.opacity === 'number') {
        setWallpaperOpacity(wallpaperPayload.opacity);
      }
      if (typeof wallpaperPayload.blur === 'boolean') {
        setWallpaperBlur(wallpaperPayload.blur);
      }

      setMessages((mPrev) => [
        ...mPrev,
        {
          id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          system: true,
          text: `🎨 ${wallpaperPayload.senderName || 'Someone'} set wallpaper: "${wallTitle}"`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return wallpaperPayload;
    });
  }, [userProfile]);

  // Send active room state (messages, wallpaper, theme) to newly joined or requesting peer
  const sendRoomStateToPeer = useCallback(async (targetPeerId) => {
    if (!targetPeerId) return;

    const currentMsgs = messagesRef.current || [];
    // Sanitize messages: exclude huge media attachments to ensure fast sync
    const sanitizedMsgs = currentMsgs.slice(-100).map((m) => {
      if (m.dataUrl && m.dataUrl.length > 250000) {
        return { ...m, dataUrl: '' };
      }
      return m;
    });

    const activeWall = wallpaperSettingsRef.current;
    let customImageToSend = activeWall?.customWallpaper || null;
    if (activeWall?.wallpaperType === 'custom' && customImageToSend && customImageToSend.length > 70000) {
      try {
        customImageToSend = await compressWallpaperImage(customImageToSend, 800, 0.65);
      } catch (e) {}
    }

    const syncPayload = {
      messages: sanitizedMsgs,
      wallpaper: {
        wallpaperType: activeWall?.wallpaperType || 'doodles',
        customImage: activeWall?.wallpaperType === 'custom' ? customImageToSend : null,
        opacity: typeof activeWall?.wallpaperOpacity === 'number' ? activeWall.wallpaperOpacity : 18,
        blur: Boolean(activeWall?.wallpaperBlur)
      },
      theme: currentThemeRef.current || 'sapphire',
      roomName: roomNameRef.current,
      senderId: userProfile?.id,
      senderName: userProfile?.name || 'Peer',
      timestamp: Date.now()
    };

    let payloadToSend = syncPayload;
    if (cryptoKeyRef.current) {
      try {
        const encrypted = await encryptPayload(syncPayload, cryptoKeyRef.current);
        if (encrypted) payloadToSend = encrypted;
      } catch (err) {
        console.warn('Failed to encrypt room-state-sync:', err);
      }
    }

    // 1. Send via direct WebRTC DataChannel if open
    let sentDirect = false;
    if (webrtcRef.current) {
      sentDirect = webrtcRef.current.sendRoomStateSyncToPeer(targetPeerId, payloadToSend);
    }

    // 2. Also send via signaling relay if direct channel wasn't open or to guarantee delivery
    if (!sentDirect && socketRef.current) {
      try {
        socketRef.current.emit('e2ee-relay', {
          to: targetPeerId,
          type: 'room-state-sync',
          payload: payloadToSend
        });
      } catch (e) {}
    }
  }, [userProfile]);

  // Handle incoming room state sync when joining an existing room
  const handleIncomingRoomStateSync = useCallback(async (payload, fromPeerId) => {
    if (!payload) return;
    let data = payload;
    if (typeof payload === 'string' || (payload.ciphertext && payload.iv)) {
      try {
        const decrypted = await decryptPayload(payload, cryptoKeyRef.current);
        if (decrypted) data = decrypted;
      } catch (err) {
        console.warn('Failed to decrypt room-state-sync:', err);
        return;
      }
    }

    if (!data) return;

    // 1. Inherit Wallpaper
    if (data.wallpaper) {
      const wall = data.wallpaper;
      if (wall.wallpaperType) {
        setWallpaperType(wall.wallpaperType);
        try { localStorage.setItem('intekchat_wallpaper_type', wall.wallpaperType); } catch {}
      }
      if (wall.customImage !== undefined) {
        setCustomWallpaper(wall.customImage);
        try {
          if (wall.customImage) localStorage.setItem('intekchat_wallpaper_custom', wall.customImage);
          else localStorage.removeItem('intekchat_wallpaper_custom');
        } catch {}
      }
      if (typeof wall.opacity === 'number') {
        setWallpaperOpacity(wall.opacity);
        try { localStorage.setItem('intekchat_wallpaper_opacity', String(wall.opacity)); } catch {}
      }
      if (typeof wall.blur === 'boolean') {
        setWallpaperBlur(wall.blur);
        try { localStorage.setItem('intekchat_wallpaper_blur', String(wall.blur)); } catch {}
      }
      setSyncedWallpaper(wall);
    }

    // 2. Inherit Theme
    if (data.theme) {
      const validThemes = ['sapphire', 'silk', 'cyberpunk', 'amber', 'amethyst', 'emerald', 'obsidian', 'frost'];
      if (validThemes.includes(data.theme)) {
        setCurrentTheme(data.theme);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('intekchat_theme', data.theme);
            document.documentElement.setAttribute('data-theme', data.theme);
          } catch {}
        }
      }
    }

    // 3. Inherit Chat Messages
    if (Array.isArray(data.messages) && data.messages.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const incoming = data.messages.filter((m) => m && m.id && !existingIds.has(m.id));
        if (incoming.length === 0) return prev;

        const combined = [...prev, ...incoming].sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeA - timeB;
        });

        if (typeof window !== 'undefined' && roomNameRef.current) {
          try {
            const sanitized = combined.slice(-250).map((m) => {
              if (m.dataUrl && m.dataUrl.length > 400000) {
                return { ...m, dataUrl: '' };
              }
              return m;
            });
            localStorage.setItem(getRoomStorageKey(roomNameRef.current), JSON.stringify(sanitized));
          } catch {}
        }

        sounds.playMessage();
        return combined;
      });
    }
  }, []);

  // Auto-clean expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const stillActive = prev.filter((u) => now - u.timestamp < 3500);
        return stillActive.length === prev.length ? prev : stillActive;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // 3. Connect to Signaling Server & WebRTC Manager (Hybrid: Local Socket.IO + Cloud Fallback)
  useEffect(() => {
    if (!userProfile) return;

    let activeSignaling = null;
    let customServerUrl = undefined;
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('intekchat_signaling_url');
      if (storedUrl) customServerUrl = storedUrl;
      else if (process.env.NEXT_PUBLIC_SIGNALING_SERVER) customServerUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER;
    }

    const isVercel = typeof window !== 'undefined' && 
      (window.location.hostname.endsWith('vercel.app') || window.location.hostname.includes('vercel'));

    let socket = null;
    let usingCloudFallback = false;

    const setupSignalingListeners = (signaling) => {
      socketRef.current = signaling;

      // Handle room password protection required from server
      signaling.on('room-password-required', ({ room, isProtected, reason }) => {
        setIsRoomProtected(true);
        setPendingRoom(room);
        setPasswordPromptError(reason || 'This room is password-protected. Enter password to unlock.');
        setIsPasswordPromptOpen(true);
      });

      // Room Peers Update
      signaling.on('room-peers', ({ peers: initialPeers, selfId, isProtected, totalCount }) => {
        if (typeof isProtected === 'boolean') {
          setIsRoomProtected(isProtected);
        }
        const filtered = (initialPeers || []).filter((p) => p.id !== selfId);
        setPeers(filtered);
        setTotalParticipants(typeof totalCount === 'number' ? totalCount : filtered.length + 1);

        // If joining an existing room where other peers are already present, request room state (chats, wallpaper, theme)
        if (filtered.length > 0) {
          const hostPeer = filtered[0];
          try {
            signaling.emit('e2ee-relay', {
              to: hostPeer.id,
              type: 'request-room-sync'
            });
          } catch (e) {}
        }

        // Snapdrop deterministic single-offerer:
        // Only initiate offer if our ID is greater than remote peer's ID to prevent glare and collisions
        filtered.forEach((p) => {
          if (p.id && selfId && selfId > p.id) {
            webrtcRef.current?.connectToPeer(p.id);
          }
        });
      });

      signaling.on('room-count-update', ({ totalCount }) => {
        if (typeof totalCount === 'number') {
          setTotalParticipants(totalCount);
        }
      });

      signaling.on('peer-joined', (newPeer) => {
        sounds.playJoin();
        setPeers((prev) => {
          if (prev.some((p) => p.id === newPeer.id)) return prev;
          const next = [...prev, newPeer];
          setTotalParticipants(next.length + 1);
          return next;
        });

        // Connect to newly joined peer (deterministic single offerer)
        if (newPeer.id && userProfile?.id && userProfile.id > newPeer.id) {
          webrtcRef.current?.connectToPeer(newPeer.id);
        }
        // Send full active room state (messages, wallpaper, theme) to newly joined peer
        if (newPeer.id) {
          sendRoomStateToPeer(newPeer.id);
        }
      });

      signaling.on('peer-updated', (updatedPeer) => {
        setPeers((prev) =>
          prev.map((p) => (p.id === updatedPeer.id ? updatedPeer : p))
        );
      });

      signaling.on('peer-left', ({ id }) => {
        sounds.playLeave();
        setPeers((prev) => {
          const departingPeer = prev.find((p) => p.id === id);
          const next = prev.filter((p) => p.id !== id);
          setTotalParticipants(Math.max(1, next.length + 1));
          if (departingPeer) {
            setMessages((mPrev) => [
              ...mPrev,
              {
                id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                system: true,
                text: `👋 ${departingPeer.name || 'A participant'} left the room`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
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

      // Room Details Updated by Host
      signaling.on('room-details-updated', ({ oldRoom, newRoom, isProtected, message }) => {
        sounds.playSuccess();
        if (typeof window !== 'undefined' && oldRoom && newRoom) {
          try {
            const oldKey = getRoomStorageKey(oldRoom);
            const newKey = getRoomStorageKey(newRoom);
            const oldMsgs = localStorage.getItem(oldKey);
            if (oldMsgs) {
              localStorage.setItem(newKey, oldMsgs);
              localStorage.removeItem(oldKey);
            }
          } catch {}
        }
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

      // Encrypted Relay Fallback
      signaling.on('e2ee-relay', async ({ from, payload, type }) => {
        if (type === 'chat') {
          const decrypted = await decryptPayload(payload, cryptoKeyRef.current);
          if (decrypted && decrypted.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === decrypted.id)) return prev;
              sounds.playMessage();
              return [...prev, decrypted];
            });
          }
        } else if (type === 'clear') {
          sounds.playBurn();
          setMessages([]);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(getRoomStorageKey(roomName));
            } catch {}
          }
        } else if (type === 'view-once-burned') {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.messageId ? { ...m, isBurned: true, dataUrl: '' } : m))
          );
        } else if (type === 'typing') {
          handleIncomingTyping(payload);
        } else if (type === 'message-seen') {
          handleIncomingMessageSeen(payload);
        } else if (type === 'room-wallpaper') {
          handleIncomingRoomWallpaper(payload);
        } else if (type === 'room-state-sync') {
          handleIncomingRoomStateSync(payload, from);
        } else if (type === 'request-room-sync') {
          sendRoomStateToPeer(from);
        } else if (type === 'file-relay-start') {
          // Initialize incoming relay transfer
          relayIncomingFilesRef.current.set(payload.id, {
            id: payload.id,
            name: payload.name,
            size: payload.size,
            mimeType: payload.mimeType,
            totalChunks: payload.totalChunks,
            senderId: from,
            senderName: payload.senderName || 'Peer',
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now(),
            lastTelemetryTime: Date.now(),
            lastTelemetryBytes: 0
          });
          sounds.playTransferStart();
          setActiveTransfers((prev) => ({
            ...prev,
            [payload.id]: {
              id: payload.id,
              direction: 'receive',
              fileName: payload.name,
              totalBytes: payload.size,
              receivedBytes: 0,
              progress: 0,
              speed: 0,
              senderId: from
            }
          }));
        } else if (type === 'file-relay-chunk') {
          const record = relayIncomingFilesRef.current.get(payload.id);
          if (record) {
            try {
              const binaryStr = atob(payload.chunk);
              const len = binaryStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              if (
                typeof payload.index === 'number' &&
                payload.index >= 0 &&
                payload.index < (record.totalChunks || 100000)
              ) {
                record.chunks[payload.index] = bytes.buffer;
                record.receivedBytes += len;
              }

              const now = Date.now();
              if (now - record.lastTelemetryTime > 150 || record.receivedBytes >= record.size) {
                const timeDelta = (now - record.lastTelemetryTime) / 1000;
                const bytesDelta = record.receivedBytes - record.lastTelemetryBytes;
                const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
                record.lastTelemetryTime = now;
                record.lastTelemetryBytes = record.receivedBytes;
                const progress = Math.min(100, Math.round((record.receivedBytes / record.size) * 100));

                setActiveTransfers((prev) => {
                  if (!prev[record.id]) return prev;
                  return {
                    ...prev,
                    [record.id]: {
                      ...prev[record.id],
                      receivedBytes: record.receivedBytes,
                      progress,
                      speed
                    }
                  };
                });
              }
            } catch (err) {
              console.warn('Error processing relay chunk:', err);
            }
          }
        } else if (type === 'file-relay-done') {
          const record = relayIncomingFilesRef.current.get(payload.id);
          if (record) {
            const blob = new Blob(record.chunks, {
              type: record.mimeType || 'application/octet-stream'
            });
            const url = URL.createObjectURL(blob);
            sounds.playTransferComplete();
            setActiveTransfers((prev) => {
              const next = { ...prev };
              delete next[record.id];
              return next;
            });
            // Snapdrop-style instant auto-download directly to disk
            let autoSaved = false;
            try {
              const a = document.createElement('a');
              a.href = url;
              a.download = record.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              autoSaved = true;
            } catch (err) {
              console.warn('Auto download error:', err);
            }

            setReceivedFileModal({
              id: record.id,
              name: record.name,
              size: record.size,
              mimeType: record.mimeType,
              blob,
              url,
              senderId: from,
              senderName: record.senderName,
              autoDownloaded: autoSaved
            });
            relayIncomingFilesRef.current.delete(payload.id);
          }
        }
      });
    };

    const initWebRTC = (signaling) => {
      const webrtc = new WebRTCManager(signaling, userProfile, {
        onChannelOpen: (peerId) => {
          sounds.playJoin();
          // Send complete room state (messages, wallpaper, theme) to the newly connected peer
          sendRoomStateToPeer(peerId);
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

          // Snapdrop-style instant auto-download directly to disk
          let autoSaved = false;
          try {
            const a = document.createElement('a');
            a.href = completedFile.url;
            a.download = completedFile.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            autoSaved = true;
          } catch (err) {
            console.warn('Auto download error:', err);
          }

          setReceivedFileModal({
            ...completedFile,
            autoDownloaded: autoSaved
          });
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
          if (decrypted && decrypted.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === decrypted.id)) return prev;
              sounds.playMessage();
              return [...prev, decrypted];
            });
          }
        },
        onChatClear: () => {
          sounds.playBurn();
          setMessages([]);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(getRoomStorageKey(roomName));
            } catch {}
          }
        },
        onViewOnceBurned: (messageId) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, isBurned: true, dataUrl: '' } : m))
          );
        },
        onTyping: (data) => {
          handleIncomingTyping(data);
        },
        onMessageSeen: (data) => {
          handleIncomingMessageSeen(data);
        },
        onRoomWallpaper: (payload) => {
          handleIncomingRoomWallpaper(payload);
        },
        onRoomStateSync: (payload, fromPeerId) => {
          handleIncomingRoomStateSync(payload, fromPeerId);
        },
        onRequestRoomSync: (fromPeerId) => {
          sendRoomStateToPeer(fromPeerId);
        }
      });
      webrtcRef.current = webrtc;
    };

    // Unified signaling network: IntekDrop uses shared radar mesh room so all devices discover each other!
    const effectiveRoom = (activeTab === 'chat'
      ? (roomName ? roomName.trim().toLowerCase().replace(/\s+/g, '-') : 'intekchat-lobby')
      : 'intekdrop-network'
    );

    // If on Vercel and no custom server URL configured, use CloudSignalingAdapter directly
    if (isVercel && !customServerUrl) {
      usingCloudFallback = true;
      activeSignaling = new CloudSignalingAdapter(effectiveRoom, userProfile);
      initWebRTC(activeSignaling);
      setupSignalingListeners(activeSignaling);
    } else {
      // Connect to local or custom Socket.IO signaling server
      socket = io(customServerUrl || undefined, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 4000
      });
      activeSignaling = socket;
      initWebRTC(activeSignaling);
      setupSignalingListeners(activeSignaling);

      socket.on('connect', async () => {
        let passwordHash = null;
        if (roomPassword && isRoomProtected) {
          try {
            passwordHash = await hashPassword(roomPassword);
          } catch (err) {
            console.error('Failed to hash room password:', err);
          }
        }
        socket.emit('join-network', {
          room: effectiveRoom,
          passwordHash,
          peerInfo: userProfile
        });
      });

      // If socket.io fails to connect, automatically fall back to cloud signaling
      const fallbackTimer = setTimeout(() => {
        if (!socket.connected && !usingCloudFallback) {
          usingCloudFallback = true;
          try { socket.disconnect(); } catch {}
          activeSignaling = new CloudSignalingAdapter(effectiveRoom, userProfile);
          initWebRTC(activeSignaling);
          setupSignalingListeners(activeSignaling);
        }
      }, 4000);

      socket.on('connect_error', () => {
        if (!socket.connected && !usingCloudFallback) {
          usingCloudFallback = true;
          clearTimeout(fallbackTimer);
          try { socket.disconnect(); } catch {}
          activeSignaling = new CloudSignalingAdapter(effectiveRoom, userProfile);
          initWebRTC(activeSignaling);
          setupSignalingListeners(activeSignaling);
        }
      });
    }

    return () => {
      webrtcRef.current?.destroy();
      activeSignaling?.disconnect?.();
    };
  }, [userProfile, dropPairId, roomName, roomPassword, activeTab]);

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
    const cleanRoom = (newRoom || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Clean previous room state so every new room starts completely fresh
    setMessages([]);
    setWallpaperType('doodles');
    setCustomWallpaper(null);
    setWallpaperOpacity(18);
    setWallpaperBlur(false);
    setSyncedWallpaper(null);
    syncedWallpaperRef.current = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('intekchat_wallpaper_custom');
        localStorage.removeItem('intekchat_wallpaper_type');
        localStorage.removeItem('intekchat_wallpaper_opacity');
        localStorage.removeItem('intekchat_wallpaper_blur');
      } catch {}
    }

    setRoomName(cleanRoom);
    setRoomPassword(password || '');
    setIsRoomProtected(!!password);
    setTotalParticipants(1);
    setActiveTab('chat');
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'chat');
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
        url.searchParams.delete('pair');
        window.history.pushState({}, '', url.toString());
      } catch (e) {
        console.warn('URL update warning:', e);
      }
    }
    sounds.playJoin();
  };

  // Handle Joining from in-app Camera QR Scanner
  const handleJoinScannedRoom = ({ room, pwd, tab, pair }) => {
    if (pair || tab === 'drop') {
      setActiveTab('drop');
      if (pair) {
        const cleanPair = pair.trim().toLowerCase();
        setDropPairId(cleanPair);
        setRoomName(cleanPair);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'drop');
          url.searchParams.set('pair', cleanPair);
          url.searchParams.delete('room');
          url.searchParams.delete('pwd');
          window.history.pushState({}, '', url.toString());
        }
      }
      sounds.playJoin();
      return;
    }

    if (room) {
      const cleanRoom = room.trim().toLowerCase().replace(/\s+/g, '-');
      // Clean previous room state so scanned room starts fresh or inherits from active peers
      setMessages([]);
      setWallpaperType('doodles');
      setCustomWallpaper(null);
      setWallpaperOpacity(18);
      setWallpaperBlur(false);
      setSyncedWallpaper(null);
      syncedWallpaperRef.current = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('intekchat_wallpaper_custom');
          localStorage.removeItem('intekchat_wallpaper_type');
          localStorage.removeItem('intekchat_wallpaper_opacity');
          localStorage.removeItem('intekchat_wallpaper_blur');
        } catch {}
      }

      setRoomName(cleanRoom);
      setRoomPassword(pwd || '');
      setIsRoomProtected(!!pwd);
      setTotalParticipants(1);
      setActiveTab('chat');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', cleanRoom);
        url.searchParams.set('tab', 'chat');
        if (pwd) url.searchParams.set('pwd', pwd);
        else url.searchParams.delete('pwd');
        url.searchParams.delete('pair');
        window.history.pushState({}, '', url.toString());
      }
      sounds.playJoin();
    }
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
                text: `Room details updated to #${cleanNew} (${res.isProtected ? 'Password Protected 🔒' : 'Open Room 🔓'})`,
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
    // 1. Wipe chat messages for this room from local storage and memory
    if (typeof window !== 'undefined' && roomName) {
      try {
        localStorage.removeItem(getRoomStorageKey(roomName));
      } catch {}
    }
    setMessages([]);

    // 2. Wipe wallpaper completely and reset to clean defaults
    setWallpaperType('doodles');
    setCustomWallpaper(null);
    setWallpaperOpacity(18);
    setWallpaperBlur(false);
    setSyncedWallpaper(null);
    syncedWallpaperRef.current = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('intekchat_wallpaper_custom');
        localStorage.removeItem('intekchat_wallpaper_type');
        localStorage.removeItem('intekchat_wallpaper_opacity');
        localStorage.removeItem('intekchat_wallpaper_blur');
      } catch {}
    }

    // 3. Reset theme to default sapphire
    setCurrentTheme('sapphire');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('intekchat_theme', 'sapphire');
        document.documentElement.setAttribute('data-theme', 'sapphire');
      } catch {}
    }

    // 4. Reset room metadata
    setRoomName('');
    setRoomPassword('');
    setIsRoomProtected(false);
    setTotalParticipants(1);
    setPeers([]);

    // 5. Clean URL query parameters
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        url.searchParams.delete('pwd');
        window.history.pushState({}, '', url.toString());
      } catch {}
    }

    // 6. Notify signaling server and clean up WebRTC
    try {
      socketRef.current?.emit('leave-room');
    } catch {}
    try {
      webrtcRef.current?.destroy();
    } catch {}

    // 7. Reset active file transfers and typing indicators
    setActiveTransfers({});
    setTypingUsers([]);

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

  // Encrypted Relay File Transfer Fallback (Direct P2P DataChannel Bypass)
  const sendFileViaRelay = async (peerId, file, onProgress, transferId) => {
    if (!socketRef.current) throw new Error('Signaling connection is closed');

    const RELAY_CHUNK_SIZE = 32 * 1024; // 32KB chunking
    const totalChunks = Math.ceil(file.size / RELAY_CHUNK_SIZE);

    // 1. Send file metadata header via encrypted relay
    socketRef.current.emit('e2ee-relay', {
      to: peerId,
      type: 'file-relay-start',
      payload: {
        id: transferId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        totalChunks,
        senderName: userProfile?.name || 'Peer'
      }
    });

    sounds.playTransferStart();

    // 2. Stream binary slices
    let offset = 0;
    let sentBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    for (let index = 0; index < totalChunks; index++) {
      if (cancelTokensRef.current.has(transferId)) {
        throw new Error('Transfer cancelled by user');
      }

      const slice = file.slice(offset, offset + RELAY_CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkLen = bytes.byteLength;
      for (let b = 0; b < chunkLen; b++) {
        binary += String.fromCharCode(bytes[b]);
      }
      const base64Chunk = btoa(binary);

      socketRef.current.emit('e2ee-relay', {
        to: peerId,
        type: 'file-relay-chunk',
        payload: {
          id: transferId,
          index,
          totalChunks,
          chunk: base64Chunk
        }
      });

      offset += chunkLen;
      sentBytes += chunkLen;

      const now = Date.now();
      if (now - lastTime > 150 || sentBytes >= file.size) {
        const timeDelta = (now - lastTime) / 1000;
        const bytesDelta = sentBytes - lastBytes;
        const speed = timeDelta > 0 ? bytesDelta / timeDelta : 0;
        lastTime = now;
        lastBytes = sentBytes;
        const progress = Math.min(100, Math.round((sentBytes / file.size) * 100));

        if (onProgress) {
          onProgress({ sentBytes, progress, speed });
        }
      }

      // Small yield to prevent socket overflow and keep UI smooth
      if (index % 4 === 0) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    // 3. Send transfer complete
    socketRef.current.emit('e2ee-relay', {
      to: peerId,
      type: 'file-relay-done',
      payload: { id: transferId }
    });

    sounds.playTransferComplete();
  };

  // Send File in IntekDrop Tab (Hybrid: WebRTC P2P Direct + Automatic Encrypted Relay Fallback)
  const executeSendFile = async (peerId, file) => {
    if (!webrtcRef.current && !socketRef.current) return;

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
      // 1. First attempt ultra-fast direct WebRTC DataChannel transfer (full local WiFi gigabit speed)
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
    } catch (webrtcErr) {
      console.warn('Direct WebRTC transfer unavailable, falling back to seamless encrypted cloud relay...', webrtcErr);
      try {
        // 2. Seamless fallback: Transfer over encrypted cloud relay (works across strict firewalls / mobile data)
        await sendFileViaRelay(
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
          transferId
        );

        setTimeout(() => {
          setActiveTransfers((prev) => {
            const next = { ...prev };
            delete next[transferId];
            return next;
          });
        }, 1500);
      } catch (relayErr) {
        console.error('All send mechanisms failed:', relayErr);
        alert(`Could not send file: ${relayErr.message}`);
        setActiveTransfers((prev) => {
          const next = { ...prev };
          delete next[transferId];
          return next;
        });
      }
    }
  };

  const processSendQueue = async () => {
    if (isSendingFileRef.current || sendQueueRef.current.length === 0) return;
    isSendingFileRef.current = true;
    const task = sendQueueRef.current.shift();
    if (task) {
      try {
        await executeSendFile(task.peerId, task.file);
      } catch (e) {
        console.error('File send task error:', e);
      }
    }
    isSendingFileRef.current = false;
    if (sendQueueRef.current.length > 0) {
      setTimeout(processSendQueue, 50);
    }
  };

  const handleSendFile = (peerId, file) => {
    sendQueueRef.current.push({ peerId, file });
    processSendQueue();
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
      isBurned: false,
      seen: false,
      seenBy: []
    };

    // 1. Add plaintext directly to sender's view (deduplicated)
    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) return prev;
      return [...prev, fullMessage];
    });

    // 2. Encrypt with AES-256-GCM before transmitting
    const encrypted = await encryptPayload(fullMessage, cryptoKeyRef.current);

    // 3. Send over WebRTC DataChannels first to all connected peers
    let sentPeerIds = [];
    if (webrtcRef.current) {
      sentPeerIds = webrtcRef.current.broadcastChatMessage(encrypted) || [];
    }

    // 4. Fallback encrypted zero-knowledge relay:
    // If ANY peer in the room was not reached via direct WebRTC DataChannel (e.g. 3 devices
    // connected, but WebRTC channel established only to 1 peer or pending on mobile carrier NAT),
    // broadcast via relay so ALL devices in the room receive the message!
    if (socketRef.current) {
      const activePeers = peers || [];
      const reachedCount = Array.isArray(sentPeerIds) ? sentPeerIds.length : 0;
      if (reachedCount < activePeers.length || activePeers.length === 0) {
        socketRef.current.emit('e2ee-relay', {
          payload: encrypted,
          type: 'chat'
        });
      }
    }
  };

  // Clear Chat (Dual Memory Wipe)
  const handleClearChat = () => {
    setMessages([]);
    sounds.playBurn();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getRoomStorageKey(roomName));
      } catch {}
    }

    let sentPeerIds = [];
    if (webrtcRef.current) {
      sentPeerIds = webrtcRef.current.broadcastClearChat() || [];
    }
    if (socketRef.current) {
      const activePeers = peers || [];
      const reachedCount = Array.isArray(sentPeerIds) ? sentPeerIds.length : 0;
      if (reachedCount < activePeers.length || activePeers.length === 0) {
        socketRef.current.emit('e2ee-relay', {
          type: 'clear'
        });
      }
    }
  };

  // Burn View-Once Image
  const handleBurnViewOnce = (messageId, senderId) => {
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === messageId ? { ...m, isBurned: true, dataUrl: '' } : m));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getRoomStorageKey(roomName), JSON.stringify(next.slice(-250)));
        } catch {}
      }
      return next;
    });

    let sentDirect = false;
    if (webrtcRef.current) {
      sentDirect = webrtcRef.current.sendViewOnceBurned(senderId, messageId);
    }
    if (!sentDirect && socketRef.current) {
      socketRef.current.emit('e2ee-relay', {
        to: senderId,
        type: 'view-once-burned',
        payload: { messageId }
      });
    }
  };

  // Typing state broadcaster
  const handleTypingChange = useCallback((isTyping) => {
    if (!userProfile) return;
    const senderName = userProfile?.name || 'Anonymous';
    webrtcRef.current?.broadcastTyping(isTyping, senderName);
    if (socketRef.current) {
      socketRef.current.emit('e2ee-relay', {
        type: 'typing',
        payload: { isTyping, senderId: userProfile?.id, senderName }
      });
    }
  }, [userProfile]);

  // Mark unseen messages as seen and broadcast receipt
  const handleMarkMessagesSeen = useCallback((unseenMessageIds) => {
    if (!Array.isArray(unseenMessageIds) || unseenMessageIds.length === 0 || !userProfile) return;
    const receipt = {
      messageIds: unseenMessageIds,
      readerId: userProfile?.id,
      readerName: userProfile?.name || 'Peer'
    };
    webrtcRef.current?.broadcastMessageSeen(receipt);
    if (socketRef.current) {
      socketRef.current.emit('e2ee-relay', {
        type: 'message-seen',
        payload: receipt
      });
    }
  }, [userProfile]);

  // Broadcast room wallpaper to all participants
  const handleBroadcastWallpaper = useCallback(async (wallpaperSettings) => {
    if (!userProfile) return;

    let finalCustomImage = wallpaperSettings.customImage;
    if (wallpaperSettings.wallpaperType === 'custom' && finalCustomImage && finalCustomImage.length > 70000) {
      try {
        finalCustomImage = await compressWallpaperImage(finalCustomImage, 900, 0.70);
      } catch (e) {}
    }

    const payload = {
      ...wallpaperSettings,
      customImage: wallpaperSettings.wallpaperType === 'custom' ? finalCustomImage : null,
      senderId: userProfile?.id,
      senderName: userProfile?.name || 'Anonymous',
      timestamp: Date.now()
    };
    setSyncedWallpaper(payload);

    const wallTitle = wallpaperSettings.wallpaperType === 'custom'
      ? 'Custom Photo'
      : (wallpaperSettings.wallpaperType === 'none' ? 'Clean Solid' : wallpaperSettings.wallpaperType || 'Preset');

    setMessages((mPrev) => [
      ...mPrev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        system: true,
        text: `🎨 You set wallpaper: "${wallTitle}"`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // 1. Send over direct WebRTC DataChannels to all connected peers
    if (webrtcRef.current) {
      try {
        webrtcRef.current.broadcastRoomWallpaper(payload);
      } catch (e) {
        console.warn('WebRTC wallpaper broadcast warning:', e);
      }
    }
    // 2. ALWAYS also emit through signaling relay to guarantee 100% room delivery
    if (socketRef.current) {
      try {
        socketRef.current.emit('e2ee-relay', {
          type: 'room-wallpaper',
          payload
        });
      } catch (e) {
        console.warn('Signaling wallpaper relay warning:', e);
      }
    }
  }, [userProfile]);

  const handleDeleteMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    sounds.playClick();
  }, []);

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
        setActiveTab={handleSwitchTab}
        roomName={roomName}
        peerCount={peers.length}
        totalParticipants={totalParticipants}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenQr={(mode = 'show') => {
          setQrModalMode(mode);
          setIsQrModalOpen(true);
        }}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        onOpenAppearance={handleOpenAppearance}
        isRoomProtected={isRoomProtected}
        onOpenRoomModal={() => handleOpenRoomModal()}
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
            onOpenQr={(mode = 'show') => {
              setQrModalMode(mode);
              setIsQrModalOpen(true);
            }}
            roomName={roomName}
            dropPairId={dropPairId || ''}
          />
        ) : (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onDeleteMessage={handleDeleteMessage}
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
            onOpenQr={(mode = 'show') => {
              setQrModalMode(mode);
              setIsQrModalOpen(true);
            }}
            onLeaveRoom={handleLeaveRoom}
            typingUsers={typingUsers}
            onTypingChange={handleTypingChange}
            syncedWallpaper={syncedWallpaper}
            onBroadcastWallpaper={handleBroadcastWallpaper}
            onMarkMessagesSeen={handleMarkMessagesSeen}
            wallpaperType={wallpaperType}
            customWallpaper={customWallpaper}
            wallpaperOpacity={wallpaperOpacity}
            wallpaperBlur={wallpaperBlur}
            onOpenAppearance={handleOpenAppearance}
            onSelectWallpaper={handleSelectWallpaper}
            onUploadCustomWallpaper={handleUploadCustomWallpaper}
            onClearCustomWallpaper={handleClearCustomWallpaper}
            onChangeWallpaperOpacity={handleChangeWallpaperOpacity}
            onToggleWallpaperBlur={handleToggleWallpaperBlur}
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

      {/* QR Code / Share Room Modal & Camera Scanner */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        roomName={roomName}
        roomPassword={roomPassword}
        isRoomProtected={isRoomProtected}
        activeTab={activeTab}
        dropPairId={dropPairId || userProfile?.id || ''}
        userProfile={userProfile}
        peers={peers}
        initialMode={qrModalMode}
        onJoinScannedRoom={handleJoinScannedRoom}
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

      {/* Unified Appearance Modal (App Color Theme & Chat Wallpaper) */}
      <WallpaperModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
        initialTab={appearanceInitialTab}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectTheme}
        currentWallpaper={wallpaperType}
        customImage={customWallpaper}
        opacity={wallpaperOpacity}
        blur={wallpaperBlur}
        isRoomActive={!!roomName}
        roomName={roomName}
        onSelectWallpaper={handleSelectWallpaper}
        onUploadCustom={handleUploadCustomWallpaper}
        onClearCustom={handleClearCustomWallpaper}
        onChangeOpacity={handleChangeWallpaperOpacity}
        onToggleBlur={handleToggleWallpaperBlur}
        onBroadcastWallpaper={handleBroadcastWallpaper}
      />
    </div>
  );
}
