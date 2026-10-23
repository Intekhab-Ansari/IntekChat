'use client';

import React from 'react';
import { 
  Radio, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  QrCode, 
  Share2, 
  ShieldCheck, 
  User, 
  Wifi, 
  Lock, 
  Copy, 
  Check,
  Palette,
  Plus
} from 'lucide-react';
import { getAvatarColor } from '@/lib/peer';

export default function Navbar({
  activeTab,
  setActiveTab,
  roomName,
  peerCount,
  totalParticipants = 1,
  userProfile,
  onOpenProfile,
  onOpenQr,
  soundMuted,
  onToggleSound,
  currentTheme = 'sapphire',
  onSelectTheme,
  isRoomProtected = false,
  onOpenRoomModal
}) {
  const [copied, setCopied] = React.useState(false);
  const [showThemePicker, setShowThemePicker] = React.useState(false);
  const avatarStyle = getAvatarColor(userProfile?.colorIndex || 0);

  const THEMES = [
    { id: 'silk', name: 'Silk Daylight', color: '#7c3aed', desc: 'Executive Clean Light Mode' },
    { id: 'sapphire', name: 'Midnight Sapphire', color: '#3b82f6', desc: 'Deep Slate & Sapphire' },
    { id: 'cyberpunk', name: 'Neon Cyberpunk', color: '#f43f5e', desc: 'Electric Tokyo Synthwave' },
    { id: 'amber', name: 'Sunset Amber', color: '#f59e0b', desc: 'Molten Ember & Terracotta' },
    { id: 'amethyst', name: 'Royal Amethyst', color: '#a855f7', desc: 'Midnight Indigo & Violet' },
    { id: 'emerald', name: 'Cyber Jade', color: '#00f59b', desc: 'Luminous Matrix Obsidian' },
    { id: 'obsidian', name: 'Obsidian Stealth', color: '#e4e4e7', desc: 'Pure Carbon & White' },
    { id: 'frost', name: 'Nordic Frost', color: '#38bdf8', desc: 'Deep Titanium & Arctic Ice' }
  ];

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="navbar-wrapper">
      <div className="navbar">
        <div className="nav-left">
        <div className="logo-container">
          <div className="logo-glow-ring">
            <img src="/favicon.svg" alt="intekchat logo" className="logo-img" width="28" height="28" />
          </div>
          <div className="logo-text-group">
            <span className="logo-title">intek<span className="logo-accent">chat</span></span>
            <span className="logo-badge">P2P • E2EE</span>
          </div>
        </div>

        {/* Section Tabs - Prominently Highlighted Dual Flagship Tools (Desktop) */}
        <div className="nav-tabs desktop-nav-tabs">
          <button
            id="tab-drop"
            className={`nav-tab nav-tab-drop ${activeTab === 'drop' ? 'active' : ''}`}
            onClick={() => setActiveTab('drop')}
            title="IntekDrop: Ultra High-Speed Local & Room P2P File Sharing"
          >
            <div className="tab-icon-wrap icon-drop">
              <Radio size={16} />
              {activeTab === 'drop' && <span className="tab-pulse-ring-cyan" />}
            </div>
            <span className="tab-title">IntekDrop</span>
            <span className="tab-pill pill-drop">Files</span>
          </button>

          <button
            id="tab-chat"
            className={`nav-tab nav-tab-chat ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="IntekChat: Ephemeral End-to-End Encrypted Room Chat & Media"
          >
            <div className="tab-icon-wrap icon-chat">
              <MessageSquare size={16} />
              {activeTab === 'chat' && <span className="tab-pulse-ring-purple" />}
            </div>
            <span className="tab-title">IntekChat</span>
            <span className="tab-pill pill-chat">E2EE</span>
          </button>
        </div>
      </div>

      <div className="nav-right">
        {/* Network / Room Status Badge: Nearby Radar in IntekDrop vs Room Manager in IntekChat */}
        {activeTab === 'drop' ? (
          <div 
            className="network-pill intekdrop-pill" 
            title="IntekDrop Nearby Radar Active"
          >
            <Radio size={14} className="text-cyan animate-pulse" />
            <span className="room-label desktop-radar-label">Nearby Radar</span>
            <span className="room-label mobile-radar-label">Radar</span>
            <span className="peer-badge" title="Nearby devices discovered">
              <span className="realtime-live-dot" />
              <span className="desktop-peer-text">
                {peerCount > 0 ? `${peerCount} nearby` : 'Searching'}
              </span>
              <span className="mobile-peer-badge-count">
                {peerCount}
              </span>
            </span>
          </div>
        ) : (
          <button 
            type="button"
            className="network-pill interactive-pill" 
            onClick={onOpenRoomModal}
            title={roomName ? `In room: #${roomName} (${isRoomProtected ? 'Password Protected' : 'Open E2EE'}). Click to manage.` : 'On Local Wi-Fi Network. Click to create or join a room.'}
          >
            {roomName ? (
              <>
                <Lock size={14} className={isRoomProtected ? 'text-pink' : 'text-accent'} />
                <span className="room-label">#{roomName}</span>
                {isRoomProtected && <span className="room-mini-badge">🔒</span>}
              </>
            ) : (
              <>
                <Wifi size={14} className="text-cyan" />
                <span className="room-label">Local Wi-Fi</span>
              </>
            )}
            <span className="peer-badge" title="Active participants in real time">
              <span className="realtime-live-dot" />
              <span className="desktop-peer-text">
                {roomName 
                  ? (totalParticipants <= 1 ? '1 in room (You)' : `${totalParticipants} in room`) 
                  : `${peerCount} ${peerCount === 1 ? 'peer' : 'peers'}`}
              </span>
              <span className="mobile-peer-badge-count">
                {roomName ? totalParticipants : peerCount}
              </span>
            </span>
          </button>
        )}

        {/* Create / Join Room Dedicated Button (Only displayed in IntekChat) */}
        {activeTab === 'chat' && (
          <button
            type="button"
            className="icon-btn btn-room-trigger"
            onClick={onOpenRoomModal}
            title="Create New Room or Join with Password"
            aria-label="Room Manager"
          >
            <Plus size={18} />
          </button>
        )}

        {/* QR Code & Share link */}
        <button 
          className="icon-btn" 
          onClick={onOpenQr} 
          title={activeTab === 'drop' ? "IntekDrop Device Pairing QR" : "IntekChat Room QR & Link"}
          aria-label={activeTab === 'drop' ? "IntekDrop Pairing QR" : "IntekChat Room QR"}
        >
          <QrCode size={18} />
        </button>

        <button 
          className="icon-btn mobile-hide-btn" 
          onClick={handleCopyLink} 
          title="Copy Invitation Link"
          aria-label="Copy Link"
        >
          {copied ? <Check size={18} className="text-emerald" /> : <Share2 size={18} />}
        </button>

        {/* Theme Selector Dropdown */}
        <div className="theme-selector-wrap mobile-hide-btn">
          <button 
            className="icon-btn" 
            onClick={() => setShowThemePicker(!showThemePicker)} 
            title="Change Appearance Theme"
            aria-label="Theme Selector"
          >
            <Palette size={18} />
          </button>

          {showThemePicker && (
            <div className="theme-dropdown-menu">
              <div className="theme-menu-header">Color Themes</div>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-menu-item ${currentTheme === t.id ? 'theme-active' : ''}`}
                  onClick={() => {
                    onSelectTheme?.(t.id);
                    setShowThemePicker(false);
                  }}
                >
                  <span className="theme-color-dot" style={{ backgroundColor: t.color }} />
                  <div className="theme-item-text">
                    <span className="theme-item-name">{t.name}</span>
                    <span className="theme-item-desc">{t.desc}</span>
                  </div>
                  {currentTheme === t.id && <Check size={14} className="text-cyan ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sound Toggle */}
        <button 
          className="icon-btn mobile-hide-btn" 
          onClick={onToggleSound} 
          title={soundMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
          aria-label="Toggle Sound"
        >
          {soundMuted ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-cyan" />}
        </button>

        {/* User Profile Chip */}
        <button 
          className="profile-chip" 
          onClick={onOpenProfile}
          title="Click to change your alias or avatar"
        >
          <div 
            className="profile-avatar" 
            style={{ 
              background: avatarStyle.bg, 
              borderColor: avatarStyle.border, 
              color: avatarStyle.text,
              boxShadow: `0 0 10px ${avatarStyle.glow}` 
            }}
          >
            <User size={14} />
          </div>
          <span className="profile-name">{userProfile?.name || 'Anonymous'}</span>
        </button>
      </div>
      </div>

      {/* Mobile Sub-Navbar: Full-Width Dual Flagship Switcher (Mobile Only) */}
      <div className="mobile-sub-navbar">
        <div className="mobile-tabs-container">
          <button
            id="mobile-tab-drop"
            type="button"
            className={`mobile-tab-btn mobile-tab-drop ${activeTab === 'drop' ? 'active' : ''}`}
            onClick={() => setActiveTab('drop')}
          >
            <div className="tab-icon-wrap icon-drop">
              <Radio size={16} />
              {activeTab === 'drop' && <span className="tab-pulse-ring-cyan" />}
            </div>
            <span className="mobile-tab-title">IntekDrop</span>
            <span className="tab-pill pill-drop">Files</span>
          </button>

          <button
            id="mobile-tab-chat"
            type="button"
            className={`mobile-tab-btn mobile-tab-chat ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <div className="tab-icon-wrap icon-chat">
              <MessageSquare size={16} />
              {activeTab === 'chat' && <span className="tab-pulse-ring-purple" />}
            </div>
            <span className="mobile-tab-title">IntekChat</span>
            <span className="tab-pill pill-chat">E2EE</span>
          </button>
        </div>
      </div>
    </header>
  );
}
