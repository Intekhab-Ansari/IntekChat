'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  MessageSquare, 
  Volume2, 
  VolumeX, 
  QrCode, 
  Share2, 
  User, 
  Wifi, 
  Lock, 
  Check,
  Palette,
  Plus,
  MoreVertical,
  X
} from 'lucide-react';
import { getAvatarColor } from '@/lib/peer';
import { sounds } from '@/lib/sound';

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
  onOpenAppearance,
  isRoomProtected = false,
  onOpenRoomModal
}) {
  const [copied, setCopied] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const avatarStyle = getAvatarColor(userProfile?.colorIndex || 0);

  // Close mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!showMobileMenu) return;

    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setShowMobileMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showMobileMenu]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      sounds.playSuccess();
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
            </div>
          </div>

          {/* Section Tabs - Desktop Flagship Switcher */}
          <div className="nav-tabs desktop-nav-tabs">
            <button
              id="tab-drop"
              type="button"
              className={`nav-tab nav-tab-drop ${activeTab === 'drop' ? 'active' : ''}`}
              onClick={() => setActiveTab('drop')}
              title="IntekDrop: Ultra High-Speed Local & Room File Sharing"
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
              type="button"
              className={`nav-tab nav-tab-chat ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              title="IntekChat: Private Encrypted Room Chat & Media"
            >
              <div className="tab-icon-wrap icon-chat">
                <MessageSquare size={16} />
                {activeTab === 'chat' && <span className="tab-pulse-ring-purple" />}
              </div>
              <span className="tab-title">IntekChat</span>
              <span className="tab-pill pill-chat">Chat</span>
            </button>
          </div>
        </div>

        <div className="nav-right">
          {/* Network / Room Status Badge */}
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
              title={roomName ? `In room: #${roomName}. Click to manage.` : 'On Local Wi-Fi Network. Click to create or join a room.'}
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
                    : `${peerCount} ${peerCount === 1 ? 'device' : 'devices'}`}
                </span>
                <span className="mobile-peer-badge-count">
                  {roomName ? totalParticipants : peerCount}
                </span>
              </span>
            </button>
          )}

          {/* DESKTOP ACTIONS: All visible horizontally on desktop */}
          <div className="desktop-actions-group">
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

            <button 
              type="button"
              className="icon-btn" 
              onClick={onOpenQr} 
              title={activeTab === 'drop' ? "IntekDrop Device Pairing QR" : "IntekChat Room QR & Link"}
              aria-label="QR Code"
            >
              <QrCode size={18} />
            </button>

            <button 
              type="button"
              className="icon-btn" 
              onClick={handleCopyLink} 
              title="Copy Invitation Link"
              aria-label="Copy Link"
            >
              {copied ? <Check size={18} className="text-emerald" /> : <Share2 size={18} />}
            </button>

            {/* Combined Theme & Wallpaper Button */}
            <button 
              type="button"
              className="icon-btn" 
              onClick={() => onOpenAppearance?.('theme')} 
              title="Customize Theme & Wallpaper"
              aria-label="Theme & Wallpaper"
            >
              <Palette size={18} />
            </button>

            {/* Sound Toggle */}
            <button 
              type="button"
              className="icon-btn" 
              onClick={onToggleSound} 
              title={soundMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
              aria-label="Toggle Sound"
            >
              {soundMuted ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-cyan" />}
            </button>

            {/* User Profile Chip */}
            <button 
              type="button"
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

          {/* MOBILE TOGGLE BUTTON: Single sleek trigger for all mobile options */}
          <div className="mobile-toggle-wrap" ref={mobileMenuRef}>
            <button
              type="button"
              className={`mobile-menu-toggle-btn ${showMobileMenu ? 'active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setShowMobileMenu(!showMobileMenu);
              }}
              title="Toggle Menu & Options"
              aria-label="Toggle Menu"
            >
              {showMobileMenu ? <X size={20} /> : <MoreVertical size={20} />}
            </button>

            {/* MOBILE QUICK MENU DROPDOWN (100% Options Parity With Desktop) */}
            {showMobileMenu && (
              <>
                <div 
                  className="mobile-menu-backdrop" 
                  onClick={() => setShowMobileMenu(false)}
                  onTouchStart={() => setShowMobileMenu(false)}
                />
                <div className="mobile-menu-dropdown animate-fade-in">
                  {/* Mode Switcher Tabs inside mobile drawer to save vertical space */}
                  <div className="mobile-menu-tabs-header">
                    <button
                      type="button"
                      className={`mobile-menu-tab-btn ${activeTab === 'drop' ? 'active' : ''}`}
                      onClick={() => {
                        sounds.playClick();
                        setActiveTab('drop');
                        setShowMobileMenu(false);
                      }}
                    >
                      <Radio size={15} />
                      <span>IntekDrop</span>
                      <span className="tab-pill pill-drop">Files</span>
                    </button>
                    <button
                      type="button"
                      className={`mobile-menu-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                      onClick={() => {
                        sounds.playClick();
                        setActiveTab('chat');
                        setShowMobileMenu(false);
                      }}
                    >
                      <MessageSquare size={15} />
                      <span>IntekChat</span>
                      <span className="tab-pill pill-chat">Chat</span>
                    </button>
                  </div>

                  <div className="mobile-menu-divider" />

                  <div className="mobile-menu-items">
                    {/* Room Manager */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        sounds.playClick();
                        setShowMobileMenu(false);
                        onOpenRoomModal?.();
                      }}
                    >
                      <Plus size={18} className="text-cyan" />
                      <div className="menu-item-text">
                        <span className="menu-item-title">Room Manager</span>
                        <span className="menu-item-sub">{roomName ? `Active: #${roomName}` : 'Create or Join Room'}</span>
                      </div>
                    </button>

                    {/* QR Code & Scanner */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        sounds.playClick();
                        setShowMobileMenu(false);
                        onOpenQr?.();
                      }}
                    >
                      <QrCode size={18} className="text-cyan" />
                      <div className="menu-item-text">
                        <span className="menu-item-title">QR Code & Scanner</span>
                        <span className="menu-item-sub">Scan camera or share QR</span>
                      </div>
                    </button>

                    {/* Share Link */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        handleCopyLink();
                      }}
                    >
                      {copied ? <Check size={18} className="text-emerald" /> : <Share2 size={18} className="text-pink" />}
                      <div className="menu-item-text">
                        <span className="menu-item-title">{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
                        <span className="menu-item-sub">Share room URL with friends</span>
                      </div>
                    </button>

                    {/* Combined Theme & Wallpaper */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        sounds.playClick();
                        setShowMobileMenu(false);
                        onOpenAppearance?.('theme');
                      }}
                    >
                      <Palette size={18} className="text-accent" />
                      <div className="menu-item-text">
                        <span className="menu-item-title">Theme & Wallpaper</span>
                        <span className="menu-item-sub">Curated themes & wallpapers</span>
                      </div>
                    </button>

                    {/* Sound Toggle */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        sounds.playClick();
                        onToggleSound?.();
                      }}
                    >
                      {soundMuted ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-cyan" />}
                      <div className="menu-item-text">
                        <span className="menu-item-title">Audio Chimes</span>
                        <span className="menu-item-sub">{soundMuted ? 'Muted' : 'Sound active'}</span>
                      </div>
                    </button>

                    {/* My Profile */}
                    <button
                      type="button"
                      className="mobile-menu-item"
                      onClick={() => {
                        sounds.playClick();
                        setShowMobileMenu(false);
                        onOpenProfile?.();
                      }}
                    >
                      <User size={18} className="text-cyan" />
                      <div className="menu-item-text">
                        <span className="menu-item-title">My Profile ({userProfile?.name || 'Anonymous'})</span>
                        <span className="menu-item-sub">Edit avatar & pseudonym</span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
