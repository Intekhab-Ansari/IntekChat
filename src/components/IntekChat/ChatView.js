'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  Repeat, 
  Infinity as InfinityIcon, 
  Lock, 
  ShieldCheck, 
  Download, 
  FileText, 
  Flame, 
  File, 
  FileArchive, 
  FileCode, 
  FileVideo, 
  FileAudio,
  EyeOff,
  CheckCheck,
  Check,
  Type,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Users,
  PanelLeft,
  ChevronLeft,
  Info,
  Key,
  DatabaseZap,
  Paintbrush,
  Edit3
} from 'lucide-react';
import { formatBytes, getAvatarColor } from '@/lib/peer';
import { sounds } from '@/lib/sound';
import WallpaperModal from '@/components/Modals/WallpaperModal';
import { getWallpaperCss } from '@/lib/wallpapers';

export default function ChatView({
  messages,
  onSendMessage,
  onSendFileInChat,
  onClearChat,
  onBurnViewOnce,
  roomName,
  peers = [],
  peerCount = 0,
  totalParticipants = 1,
  roomPassword = '',
  userProfile,
  onJoinRoom,
  isRoomProtected = false,
  onOpenRoomModal,
  onOpenEditRoom,
  onOpenProfile
}) {
  const avatarStyle = getAvatarColor(userProfile?.colorIndex || 0);
  const [inputText, setInputText] = useState('');
  const [imageMode, setImageMode] = useState('permanent');
  const [showImageModePicker, setShowImageModePicker] = useState(false);
  const [isStealthTextMode, setIsStealthTextMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });
  const [showSidebarPassword, setShowSidebarPassword] = useState(false);
  const [viewOnceModalData, setViewOnceModalData] = useState(null);
  const [viewOnceTimer, setViewOnceTimer] = useState(10);

  // Hero Room Creation & Join States
  const [heroTab, setHeroTab] = useState('create'); // 'create' | 'join'
  const [heroRoomName, setHeroRoomName] = useState('');
  const [heroProtectPassword, setHeroProtectPassword] = useState(false);
  const [heroPassword, setHeroPassword] = useState('');
  const [heroShowPassword, setHeroShowPassword] = useState(false);

  // Chat Wallpaper States
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [wallpaperType, setWallpaperType] = useState('doodles');
  const [customWallpaper, setCustomWallpaper] = useState(null);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(18);
  const [wallpaperBlur, setWallpaperBlur] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const timerRef = useRef(null);

  const generateHeroRandomRoom = () => {
    sounds.playClick();
    const adjectives = ['cyber', 'stealth', 'quantum', 'shadow', 'nexus', 'sonic', 'phantom', 'cosmic'];
    const nouns = ['vault', 'matrix', 'sanctum', 'bunker', 'haven', 'node'];
    const num = Math.floor(100 + Math.random() * 900);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    setHeroRoomName(`${adj}-${noun}-${num}`);
  };

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    if (!heroRoomName.trim()) return;
    sounds.playSuccess();
    const clean = heroRoomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    onJoinRoom(clean, heroProtectPassword ? heroPassword.trim() : null);
  };

  // Load saved wallpaper preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem('intekchat_wallpaper_type');
      if (savedType !== null) setWallpaperType(savedType);
      else setWallpaperType('doodles');

      const savedCustom = localStorage.getItem('intekchat_wallpaper_custom');
      if (savedCustom) setCustomWallpaper(savedCustom);

      const savedOpacity = localStorage.getItem('intekchat_wallpaper_opacity');
      if (savedOpacity) setWallpaperOpacity(Number(savedOpacity));

      const savedBlur = localStorage.getItem('intekchat_wallpaper_blur');
      if (savedBlur !== null) setWallpaperBlur(savedBlur === 'true');
    }
  }, []);

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
      localStorage.setItem('intekchat_wallpaper_custom', dataUrl);
      localStorage.setItem('intekchat_wallpaper_type', 'custom');
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

  const handleChangeOpacity = (val) => {
    setWallpaperOpacity(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_opacity', String(val));
    }
  };

  const handleToggleBlur = (val) => {
    setWallpaperBlur(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_blur', String(val));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStealthTextMode]);

  useEffect(() => {
    if (viewOnceModalData) {
      setViewOnceTimer(10);
      timerRef.current = setInterval(() => {
        setViewOnceTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleCloseAndBurnViewOnce();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewOnceModalData]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sounds.playMessage();
    onSendMessage({
      type: 'text',
      text: inputText.trim()
    });
    setInputText('');
  };

  const handleTriggerImageUpload = (mode) => {
    setImageMode(mode);
    setShowImageModePicker(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
      imageInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      sounds.playTransferStart();
      onSendMessage({
        type: 'image',
        dataUrl: base64Data,
        imageMode,
        name: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenericFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      sounds.playTransferStart();
      onSendMessage({
        type: 'file',
        name: file.name,
        size: file.size,
        mimeType: file.type,
        dataUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenViewOnce = (msg) => {
    sounds.playClick();
    setViewOnceModalData(msg);
  };

  const handleCloseAndBurnViewOnce = () => {
    if (viewOnceModalData) {
      sounds.playBurn();
      onBurnViewOnce(viewOnceModalData.id, viewOnceModalData.senderId);
      setViewOnceModalData(null);
    }
  };

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={20} className="text-amber" />;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return <FileVideo size={20} className="text-pink" />;
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return <FileAudio size={20} className="text-emerald" />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return <FileCode size={20} className="text-cyan" />;
    return <FileText size={20} className="text-cyan" />;
  };

  // If no room is active, render interactive Room Creation & Joining Hero
  if (!roomName) {
    return (
      <div className="chat-join-hero">
        <div className="hero-glow-bubble" />
        <div className="hero-card">
          <div className="hero-badge">
            <ShieldCheck size={16} className="text-cyan" />
            <span>Zero-Knowledge • End-to-End Encrypted</span>
          </div>

          <h1 className="hero-title">
            Private Disposable Rooms.<br />
            <span className="text-gradient">No login. No server trace.</span>
          </h1>

          <p className="hero-subtitle">
            Create a custom room with a unique name and optional password protection. All chats, images, and files stay strictly inside your browsers with AES-256-GCM encryption.
          </p>

          {/* Hero Tabs: Create vs Join */}
          <div className="hero-tabs">
            <button
              type="button"
              className={`hero-tab ${heroTab === 'create' ? 'hero-tab-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setHeroTab('create');
              }}
            >
              <Sparkles size={15} />
              <span>Create New Room</span>
            </button>

            <button
              type="button"
              className={`hero-tab ${heroTab === 'join' ? 'hero-tab-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setHeroTab('join');
              }}
            >
              <ArrowRight size={15} />
              <span>Join Existing</span>
            </button>
          </div>

          <form className="hero-form" onSubmit={handleHeroSubmit}>
            {/* Room Name Input with Prefix and Random Generator */}
            <div className="room-input-wrap">
              <span className="room-prefix">intekchat.com/</span>
              <input
                type="text"
                className="room-input"
                placeholder={heroTab === 'create' ? 'my-secret-vault' : 'enter-room-name'}
                value={heroRoomName}
                onChange={(e) => setHeroRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                required
              />
              {heroTab === 'create' && (
                <button
                  type="button"
                  className="btn-hero-random"
                  onClick={generateHeroRandomRoom}
                  title="Generate Unique Memorable Name"
                >
                  <Sparkles size={13} />
                  <span>Random</span>
                </button>
              )}
            </div>

            {/* Quick Presets for Hero */}
            {heroTab === 'create' && (
              <div className="room-preset-chips hero-preset-chips">
                <span className="preset-label">Suggestions:</span>
                {['quantum-vault', 'stealth-drop', 'cyber-matrix', 'crypto-haven', 'phantom-hub'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      sounds.playClick();
                      const num = Math.floor(100 + Math.random() * 900);
                      setHeroRoomName(`${preset}-${num}`);
                    }}
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            )}

            {/* Password Protection for Create Mode */}
            {heroTab === 'create' && (
              <div className="hero-password-box">
                <label className="hero-checkbox-row">
                  <input
                    type="checkbox"
                    checked={heroProtectPassword}
                    onChange={(e) => setHeroProtectPassword(e.target.checked)}
                    className="hero-checkbox"
                  />
                  <div className="hero-checkbox-text">
                    <span className="hero-checkbox-title">
                      <Lock size={13} className="text-accent" />
                      <span>Protect Room with Password</span>
                    </span>
                    <span className="hero-checkbox-desc">Peers will need this password to join & decrypt</span>
                  </div>
                </label>

                {heroProtectPassword && (
                  <div className="hero-password-input-wrap">
                    <Key size={16} className="text-dim" />
                    <input
                      type={heroShowPassword ? 'text' : 'password'}
                      className="hero-password-input"
                      placeholder="Set room password..."
                      value={heroPassword}
                      onChange={(e) => setHeroPassword(e.target.value)}
                      required={heroProtectPassword}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setHeroShowPassword(!heroShowPassword)}
                      tabIndex={-1}
                    >
                      {heroShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optional Password Input for Join Mode */}
            {heroTab === 'join' && (
              <div className="hero-password-input-wrap join-password-wrap">
                <Key size={16} className="text-dim" />
                <input
                  type={heroShowPassword ? 'text' : 'password'}
                  className="hero-password-input"
                  placeholder="Room password (if protected)..."
                  value={heroPassword}
                  onChange={(e) => setHeroPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setHeroShowPassword(!heroShowPassword)}
                  tabIndex={-1}
                >
                  {heroShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary hero-btn"
              disabled={!heroRoomName.trim() || (heroTab === 'create' && heroProtectPassword && !heroPassword.trim())}
            >
              <span>{heroTab === 'create' ? 'Create Encrypted Room' : 'Join Room'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="hero-quick-action">
            <span>Need an instant throwaway room?</span>
            <button 
              type="button"
              className="btn-quick-create"
              onClick={() => {
                const randomRoom = `room-${Math.random().toString(36).substring(2, 8)}`;
                onJoinRoom(randomRoom, null);
              }}
            >
              <Sparkles size={14} />
              <span>Create Instant Room</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout-wrapper">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleImageFileChange} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleGenericFileChange} 
      />

      {/* Left Room Sidebar (Structured Info) */}
      <aside className={`chat-room-sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-header">
          <div 
            className="sidebar-room-pill clickable-room-pill" 
            onClick={onOpenRoomModal}
            title="Click to manage or switch rooms"
          >
            {isRoomProtected ? <Lock size={15} className="text-pink" /> : <Lock size={15} className="text-accent" />}
            <span className="sidebar-room-name">#{roomName}</span>
            {isRoomProtected && <span className="room-mini-lock">🔒</span>}
          </div>
          <button 
            type="button"
            className="sidebar-edit-btn"
            onClick={onOpenEditRoom || onOpenRoomModal}
            title="Edit Room ID and Password Details"
          >
            <Edit3 size={14} />
          </button>
          <button 
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(false)}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Security Specs Card */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <ShieldCheck size={14} className="text-cyan" />
            <span>Session Security</span>
          </div>
          <div className="security-specs-card">
            <div className="spec-row">
              <span className="spec-label">Room ID:</span>
              <span className="spec-value font-mono">#{roomName}</span>
            </div>
            {isRoomProtected && (
              <div className="spec-row">
                <span className="spec-label">Password:</span>
                <span className="spec-value text-accent font-mono spec-password-cell">
                  {showSidebarPassword ? roomPassword : '••••••••'}
                  <button 
                    type="button" 
                    className="btn-mini-eye"
                    onClick={() => setShowSidebarPassword(!showSidebarPassword)}
                    title={showSidebarPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSidebarPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </span>
              </div>
            )}
            <div className="spec-row">
              <span className="spec-label">Access Mode:</span>
              <span className="spec-value">{isRoomProtected ? '🔒 Password Protected' : '🔓 Open E2EE'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Online In Room:</span>
              <span className="spec-value text-emerald font-bold">
                {totalParticipants <= 1 ? '1 Person (You)' : `${totalParticipants} Connected`}
              </span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Encryption:</span>
              <span className="spec-value">AES-256-GCM</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Key Exchange:</span>
              <span className="spec-value">{isRoomProtected ? 'PBKDF2 (Password Salted)' : 'PBKDF2-SHA256'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Storage:</span>
              <span className="spec-value text-accent">0 B (RAM only)</span>
            </div>
          </div>
        </div>

        {/* Connected Peers List */}
        <div className="sidebar-section sidebar-peers-section">
          <div className="sidebar-section-title">
            <Users size={14} className="text-purple" />
            <span>Peers in Room ({peers.length + 1})</span>
          </div>

          <div className="sidebar-peers-scroll">
            {/* Self Peer */}
            <div className="sidebar-peer-item self-peer-item">
              <div className="peer-mini-avatar self-mini-avatar">
                {userProfile?.name?.charAt(0) || 'Y'}
              </div>
              <div className="peer-mini-info">
                <span className="peer-mini-name">{userProfile?.name} (You)</span>
                <span className="peer-mini-meta">{userProfile?.os?.toUpperCase()} • Host</span>
              </div>
              <span className="mini-status-dot online" />
            </div>

            {/* Remote Peers */}
            {peers.map((peer, idx) => {
              const avatar = getAvatarColor(idx + 1);
              return (
                <div key={peer.id} className="sidebar-peer-item">
                  <div 
                    className="peer-mini-avatar"
                    style={{ borderColor: avatar.border, color: avatar.text, background: avatar.bg }}
                  >
                    {peer.name?.charAt(0) || 'P'}
                  </div>
                  <div className="peer-mini-info">
                    <span className="peer-mini-name">{peer.name}</span>
                    <span className="peer-mini-meta">{peer.os?.toUpperCase()} • Active</span>
                  </div>
                  <span className="mini-status-dot online" />
                </div>
              );
            })}

            {peers.length === 0 && (
              <div className="no-peers-box">
                <p>Waiting for others to join #{roomName}...</p>
                <span>Share your room link to invite peers</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="sidebar-action-btn wallpaper-btn"
            onClick={() => {
              sounds.playClick();
              setIsWallpaperModalOpen(true);
            }}
            title="Customize Chat Wallpaper & Patterns"
          >
            <Paintbrush size={14} />
            <span>Chat Wallpaper</span>
          </button>

          <button 
            type="button" 
            className="sidebar-action-btn wipe-btn"
            onClick={() => {
              sounds.playClick();
              if (window.confirm('Clear all chat messages from this session?')) {
                onClearChat();
              }
            }}
          >
            <Trash2 size={14} />
            <span>Clear Chat History</span>
          </button>
        </div>
      </aside>

      {/* Main Conversation Column */}
      <section className="chat-main-pane">
        {/* Chat Sub-Header */}
        <div className="chat-header">
          <div className="header-left">
            {!isSidebarOpen && (
              <button 
                type="button"
                className="btn-sidebar-open" 
                onClick={() => setIsSidebarOpen(true)}
                title="Show Room Info & Peers"
              >
                <PanelLeft size={16} />
                <span>Room Details</span>
              </button>
            )}

            <div 
              className="chat-room-badge clickable-room-badge"
              onClick={onOpenRoomModal}
              title="Click to manage room or switch rooms"
            >
              {isRoomProtected ? <Lock size={15} className="text-pink" /> : <Lock size={14} className="text-accent" />}
              <span className="room-title">#{roomName}</span>
              {isRoomProtected && <span className="room-protected-pill">Protected</span>}
            </div>

            <button 
              type="button" 
              className="btn-edit-room-quick"
              onClick={onOpenEditRoom || onOpenRoomModal}
              title="Edit Room ID and Password Protection"
            >
              <Edit3 size={13} />
              <span>Edit Room</span>
            </button>

            <span className="chat-peer-status" title="Real-time participants in this room">
              <span className="realtime-live-dot" />
              {peerCount === 0 
                ? '1 in room (You • Waiting for others to join)' 
                : `${totalParticipants || (peerCount + 1)} in room (${peerCount} peer${peerCount === 1 ? '' : 's'} + You)`}
            </span>
          </div>

          <div className="header-right">
            {/* Switch to Text / Stealth Privacy Toggle */}
            <button
              type="button"
              className={`btn-stealth ${isStealthTextMode ? 'stealth-active' : ''}`}
              onClick={() => setIsStealthTextMode(!isStealthTextMode)}
              title="Switch between Rich Media Mode and Discreet Text-Only Mode (Stealth Privacy)"
            >
              {isStealthTextMode ? (
                <>
                  <LayoutGrid size={15} />
                  <span>Rich Media Mode</span>
                </>
              ) : (
                <>
                  <Type size={15} />
                  <span>Switch to Text</span>
                </>
              )}
            </button>

            {/* Chat Wallpaper Button */}
            <button
              type="button"
              className="btn-wallpaper"
              onClick={() => {
                sounds.playClick();
                setIsWallpaperModalOpen(true);
              }}
              title="Customize Chat Wallpaper & Patterns"
            >
              <Paintbrush size={15} />
              <span>Wallpaper</span>
            </button>

            {/* Clear Chat Button */}
            <button 
              type="button"
              className="btn-clear-chat" 
              onClick={() => {
                sounds.playClick();
                if (window.confirm('Clear all chat messages from this session?')) {
                  onClearChat();
                }
              }}
              title="Instant wipe of chat history (Zero Trace)"
            >
              <Trash2 size={15} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Mobile Identity & Presence Strip (Shown on mobile devices) */}
        <div className="mobile-identity-strip">
          <button 
            type="button" 
            className="mobile-id-tag user-tag"
            onClick={onOpenProfile}
            title="Click to view/change your Codename & Avatar"
          >
            <span 
              className="id-dot-avatar" 
              style={{ background: avatarStyle?.border || '#3b82f6' }} 
            />
            <span className="id-tag-label">You:</span>
            <span className="id-tag-name">{userProfile?.name || 'Anonymous'}</span>
            <span className="id-tag-os">({userProfile?.os?.toUpperCase() || 'HOST'})</span>
          </button>

          <button 
            type="button" 
            className="mobile-id-tag room-tag"
            onClick={onOpenRoomModal}
            title="Room Details & Participant Count"
          >
            <span className="realtime-live-dot" />
            <span className="id-room-name">#{roomName}</span>
            <span className="id-room-count">
              {peerCount === 0 ? '1 online' : `${peerCount + 1} online`}
            </span>
          </button>
        </div>

        {/* Dynamic Wallpaper Background Canvas Layer */}
        {wallpaperType !== 'none' && (
          <div 
            className="chat-wallpaper-canvas"
            style={{
              ...getWallpaperCss(wallpaperType, customWallpaper),
              opacity: wallpaperOpacity / 100,
              filter: wallpaperBlur ? 'blur(8px)' : 'none'
            }}
          />
        )}

        {/* Security Banner */}
        <div className="security-banner">
          <ShieldCheck size={14} className="text-cyan" />
          <span>End-to-End Encrypted (AES-256-GCM) • Direct P2P Channels • Zero Server Logs</span>
        </div>

        {/* Messages Feed Container */}
        <div className="chat-messages-scroll">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="empty-bubble">
                <div className="empty-icon-shield">
                  <Lock size={28} className="text-accent animate-pulse" />
                </div>
                <h3>Room #{roomName} is Ready</h3>
                <p>This room is private and encrypted with AES-256-GCM. Messages leave zero trace on any server.</p>
                <div className="empty-quick-prompts">
                  <button 
                    type="button" 
                    className="prompt-chip prompt-chip-pink"
                    onClick={() => handleTriggerImageUpload('once')}
                  >
                    <Flame size={14} />
                    <span>Send View-Once Photo</span>
                  </button>
                  <button 
                    type="button" 
                    className="prompt-chip prompt-chip-cyan"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                  >
                    <Paperclip size={14} />
                    <span>Attach Any File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.system) {
              return (
                <div key={msg.id} className="message-system-row">
                  <div className="message-system-pill">
                    <Sparkles size={13} className="text-accent" />
                    <span>{msg.text}</span>
                    <span className="system-time">{msg.time}</span>
                  </div>
                </div>
              );
            }

            const isSelf = msg.senderId === userProfile?.id;
            const avatar = getAvatarColor(msg.senderColor || 0);

            return (
              <div 
                key={msg.id} 
                className={`message-row ${isSelf ? 'message-self' : 'message-peer'}`}
              >
                {!isSelf && (
                  <div 
                    className="msg-avatar" 
                    style={{ 
                      borderColor: avatar.border, 
                      color: avatar.text, 
                      background: avatar.bg 
                    }}
                  >
                    {msg.senderName?.charAt(0) || 'P'}
                  </div>
                )}

                <div className="msg-bubble-wrap">
                  <div className="msg-sender-info">
                    <span className="msg-sender-name">{isSelf ? 'You' : msg.senderName}</span>
                    <span className="msg-time">{msg.time}</span>
                  </div>

                  <div className="msg-bubble">
                    {/* TEXT MESSAGE */}
                    {msg.type === 'text' && (
                      <p className="msg-text">{msg.text}</p>
                    )}

                    {/* IMAGE MESSAGE */}
                    {msg.type === 'image' && (
                      <div className="msg-media-block">
                        {isStealthTextMode ? (
                          <div className="stealth-tag">
                            <ImageIcon size={14} />
                            <span>[Photo: {msg.imageMode?.toUpperCase() || 'NORMAL'}]</span>
                            {!msg.isBurned && (
                              <button 
                                type="button"
                                className="stealth-reveal-btn"
                                onClick={() => {
                                  if (msg.imageMode === 'once') handleOpenViewOnce(msg);
                                  else setViewOnceModalData(msg);
                                }}
                              >
                                View
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {msg.isBurned ? (
                              <div className="burned-badge">
                                <Flame size={16} className="text-pink animate-pulse" />
                                <span>Photo Burned (Self-Destructed)</span>
                              </div>
                            ) : msg.imageMode === 'once' ? (
                              <div 
                                className="view-once-card"
                                onClick={() => handleOpenViewOnce(msg)}
                              >
                                <div className="view-once-blur-bg" style={{ backgroundImage: `url(${msg.dataUrl})` }} />
                                <div className="view-once-overlay">
                                  <EyeOff size={22} className="text-pink animate-pulse" />
                                  <span className="view-once-title">⚡ View Once Photo</span>
                                  <span className="view-once-hint">Tap to view (Burns forever)</span>
                                </div>
                              </div>
                            ) : (
                              <div className="image-preview-card">
                                <img src={msg.dataUrl} alt={msg.name || 'Shared Image'} className="chat-img" />
                                <div className="image-mode-tag">
                                  {msg.imageMode === 'repeat' ? (
                                    <>
                                      <Repeat size={12} />
                                      <span>Repeatable</span>
                                    </>
                                  ) : (
                                    <>
                                      <InfinityIcon size={12} />
                                      <span>Permanent</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* GENERIC FILE MESSAGE */}
                    {msg.type === 'file' && (
                      <div className="msg-file-block">
                        {isStealthTextMode ? (
                          <div className="stealth-tag">
                            {getFileIcon(msg.name)}
                            <span>[{msg.name} • {formatBytes(msg.size)}]</span>
                            <a 
                              href={msg.dataUrl} 
                              download={msg.name} 
                              className="stealth-download-link"
                            >
                              Save
                            </a>
                          </div>
                        ) : (
                          <div className="chat-file-card">
                            <div className="file-icon-wrap">
                              {getFileIcon(msg.name)}
                            </div>
                            <div className="file-details">
                              <span className="file-name" title={msg.name}>{msg.name}</span>
                              <span className="file-size">{formatBytes(msg.size)}</span>
                            </div>
                            <a 
                              href={msg.dataUrl} 
                              download={msg.name} 
                              className="file-download-btn"
                              title="Download File"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Dock */}
        <div className="chat-input-wrapper">
          <form className="chat-input-bar" onSubmit={handleSendText}>
            <div className="attachment-dropdown-wrap">
              <button 
                type="button" 
                className="chat-action-btn"
                onClick={() => setShowImageModePicker(!showImageModePicker)}
                title="Attach Image (View Once, Repeat, Permanent)"
              >
                <ImageIcon size={18} className="text-pink" />
              </button>

              {showImageModePicker && (
                <div className="image-mode-picker">
                  <div className="picker-title">Send Image As:</div>
                  <button 
                    type="button" 
                    className="picker-option option-once"
                    onClick={() => handleTriggerImageUpload('once')}
                  >
                    <div className="option-icon"><Flame size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">⚡ View Once</span>
                      <span className="option-desc">Burns forever after 1 viewing</span>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className="picker-option option-repeat"
                    onClick={() => handleTriggerImageUpload('repeat')}
                  >
                    <div className="option-icon"><Repeat size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">🔁 Repeat</span>
                      <span className="option-desc">Replayable for this session</span>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className="picker-option option-permanent"
                    onClick={() => handleTriggerImageUpload('permanent')}
                  >
                    <div className="option-icon"><InfinityIcon size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">♾️ Permanent</span>
                      <span className="option-desc">Normal viewable chat photo</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="chat-action-btn"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              title="Attach Any File (ZIP, PDF, APK, Videos, Audio, etc.)"
            >
              <Paperclip size={18} className="text-cyan" />
            </button>

            <input 
              type="text" 
              className="chat-text-input" 
              placeholder="Type an encrypted message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button 
              type="submit" 
              className="chat-send-btn" 
              disabled={!inputText.trim()}
              title="Send Encrypted Message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>

      {/* View-Once Full Screen Modal */}
      {viewOnceModalData && (
        <div className="view-once-modal-overlay">
          <div className="view-once-modal-content">
            <div className="modal-burn-header">
              <div className="burn-warning">
                <Flame size={18} className="text-pink animate-pulse" />
                <span>Self-Destructing in: <strong>{viewOnceTimer}s</strong></span>
              </div>
              <button 
                type="button"
                className="btn-burn-now"
                onClick={handleCloseAndBurnViewOnce}
              >
                Close & Burn Now
              </button>
            </div>

            <div className="modal-image-wrap">
              <img 
                src={viewOnceModalData.dataUrl} 
                alt="View Once Secret" 
                className="modal-burn-img" 
              />
            </div>
          </div>
        </div>
      )}
      {/* Wallpaper Selection Modal */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        currentWallpaper={wallpaperType}
        customImage={customWallpaper}
        opacity={wallpaperOpacity}
        blur={wallpaperBlur}
        onSelectWallpaper={handleSelectWallpaper}
        onUploadCustom={handleUploadCustomWallpaper}
        onClearCustom={handleClearCustomWallpaper}
        onChangeOpacity={handleChangeOpacity}
        onToggleBlur={handleToggleBlur}
      />
    </div>
  );
}
