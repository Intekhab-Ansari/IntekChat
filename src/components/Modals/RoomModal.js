'use client';

import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Copy, 
  Check, 
  LogOut, 
  Key, 
  Eye, 
  EyeOff, 
  Hash, 
  Globe
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function RoomModal({
  isOpen,
  onClose,
  currentRoom,
  isRoomProtected = false,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom
}) {
  const [modalTab, setModalTab] = useState('create'); // 'create' | 'join'
  const [createRoomName, setCreateRoomName] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [joinRoomName, setJoinRoomName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateRandomRoomName = () => {
    sounds.playClick();
    const adjectives = ['cyber', 'stealth', 'quantum', 'shadow', 'nexus', 'sonic', 'phantom', 'cosmic', 'hyper'];
    const nouns = ['vault', 'matrix', 'sanctum', 'bunker', 'haven', 'node', 'channel', 'relay'];
    const num = Math.floor(100 + Math.random() * 900);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    setCreateRoomName(`${adj}-${noun}-${num}`);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createRoomName.trim()) return;
    sounds.playSuccess();
    const cleanName = createRoomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    onCreateRoom(cleanName, enablePassword ? createPassword.trim() : null);
    onClose();
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!joinRoomName.trim()) return;
    sounds.playClick();
    const cleanName = joinRoomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    onJoinRoom(cleanName, joinPassword.trim() || null);
    onClose();
  };

  const handleCopyLink = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card room-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              <Hash size={15} className="text-accent" />
              <span>Room Manager</span>
            </div>
            <h3>Custom Encrypted Rooms</h3>
            <p>Create a private room with custom name & optional password protection</p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Room Status Card (if in a room) */}
        {currentRoom ? (
          <div className="current-room-banner">
            <div className="current-room-info">
              <div className="current-room-icon-wrap">
                {isRoomProtected ? <Lock size={18} className="text-pink" /> : <Hash size={18} className="text-cyan" />}
              </div>
              <div className="current-room-text">
                <span className="current-room-label">Current Active Room</span>
                <span className="current-room-name">#{currentRoom}</span>
                <span className="current-room-badge-pill">
                  {isRoomProtected ? '🔒 Password Protected' : '🔓 Open E2EE Room'}
                </span>
              </div>
            </div>

            <div className="current-room-actions">
              <button 
                type="button" 
                className="btn-copy-room-link"
                onClick={handleCopyLink}
                title="Copy Room Invitation Link"
              >
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Share Link'}</span>
              </button>

              <button 
                type="button" 
                className="btn-leave-room"
                onClick={() => {
                  sounds.playClick();
                  onLeaveRoom();
                  onClose();
                }}
                title="Leave room and return to local Wi-Fi network"
              >
                <LogOut size={14} />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="current-room-banner local-banner">
            <div className="current-room-info">
              <div className="current-room-icon-wrap local-icon">
                <Globe size={18} className="text-cyan" />
              </div>
              <div className="current-room-text">
                <span className="current-room-label">Network Mode</span>
                <span className="current-room-name">Local Wi-Fi Network</span>
                <span className="current-room-subtext">Sharing with devices on the same IP</span>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tabs: Create Room vs Join Room */}
        <div className="room-modal-tabs">
          <button
            type="button"
            className={`room-modal-tab ${modalTab === 'create' ? 'tab-active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setModalTab('create');
            }}
          >
            <Sparkles size={15} />
            <span>Create New Room</span>
          </button>

          <button
            type="button"
            className={`room-modal-tab ${modalTab === 'join' ? 'tab-active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setModalTab('join');
            }}
          >
            <ArrowRight size={15} />
            <span>Join Existing Room</span>
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {modalTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="room-form">
            <div className="input-group">
              <label className="input-label">Unique Room Name:</label>
              <div className="room-input-row">
                <div className="room-prefix-box">intekchat.com/</div>
                <input
                  type="text"
                  className="modal-text-input room-name-input"
                  placeholder="e.g. secret-meeting-42"
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                />
                <button
                  type="button"
                  className="btn-random-room"
                  onClick={generateRandomRoomName}
                  title="Generate Random Memorable Name"
                >
                  <Sparkles size={14} />
                  <span>Random</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div className="room-preset-chips">
                <span className="preset-label">Quick Ideas:</span>
                {['cyber-vault', 'secret-drop', 'phantom-hub', 'dev-squad', 'stealth-zone'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      sounds.playClick();
                      const num = Math.floor(100 + Math.random() * 900);
                      setCreateRoomName(`${preset}-${num}`);
                    }}
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Protection Toggle */}
            <div className={`password-protect-card ${enablePassword ? 'protect-active' : ''}`}>
              <div className="protect-toggle-header">
                <div className="protect-title-group">
                  <div className={`protect-icon-circle ${enablePassword ? 'icon-locked' : ''}`}>
                    {enablePassword ? <Lock size={16} className="text-pink" /> : <Unlock size={16} className="text-dim" />}
                  </div>
                  <div>
                    <span className="protect-title">
                      Password Protection
                      {enablePassword && <span className="protect-status-badge">ACTIVE</span>}
                    </span>
                    <span className="protect-subtitle">
                      {enablePassword 
                        ? 'Zero-Knowledge PBKDF2 salting enabled' 
                        : 'Require a password for peers to enter & decrypt'}
                    </span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {enablePassword && (
                <div className="password-field-container">
                  <label className="input-label">Room Password:</label>
                  <div className="password-input-wrap">
                    <Key size={16} className="input-lock-icon" />
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      className="modal-text-input password-text-input"
                      placeholder="Set strong room password..."
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required={enablePassword}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      tabIndex={-1}
                    >
                      {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="password-tip">
                    <ShieldCheck size={13} className="text-cyan" />
                    <span>Password acts as a zero-knowledge AES-256 key. Only people with this password can decrypt your chat and files.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                <span>Cancel</span>
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!createRoomName.trim() || (enablePassword && !createPassword.trim())}
              >
                <Sparkles size={16} />
                <span>Create & Enter Room</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Join Room */}
        {modalTab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="room-form">
            <div className="input-group">
              <label className="input-label">Enter Room Name to Join:</label>
              <div className="room-input-row">
                <div className="room-prefix-box">intekchat.com/</div>
                <input
                  type="text"
                  className="modal-text-input room-name-input"
                  placeholder="e.g. secret-meeting-42"
                  value={joinRoomName}
                  onChange={(e) => setJoinRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Room Password (if protected):</label>
              <div className="password-input-wrap">
                <Key size={16} className="input-lock-icon" />
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  className="modal-text-input password-text-input"
                  placeholder="Optional unless room is protected..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  tabIndex={-1}
                >
                  {showJoinPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                <span>Cancel</span>
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!joinRoomName.trim()}
              >
                <span>Join Room</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
