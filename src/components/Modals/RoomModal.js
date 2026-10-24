'use client';

import React, { useState, useEffect } from 'react';
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
  Globe,
  Edit3,
  Settings,
  AlertCircle,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function RoomModal({
  isOpen,
  onClose,
  currentRoom,
  roomPassword = '',
  isRoomProtected = false,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onEditRoom,
  initialTab = null
}) {
  const [modalTab, setModalTab] = useState(initialTab || (currentRoom ? 'edit' : 'create')); // 'create' | 'join' | 'edit'
  const [showBannerPassword, setShowBannerPassword] = useState(false);
  
  // Create Room state
  const [createRoomName, setCreateRoomName] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Join Room state
  const [joinRoomName, setJoinRoomName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  // Edit Room state
  const [editRoomName, setEditRoomName] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [showEditCurrentPassword, setShowEditCurrentPassword] = useState(false);
  const [editAction, setEditAction] = useState('keep'); // 'keep' | 'change' | 'remove' (for protected) or 'add' (for open)
  const [editAddPassword, setEditAddPassword] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditNewPassword, setShowEditNewPassword] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setModalTab(initialTab);
      } else if (currentRoom) {
        setModalTab('edit');
      } else {
        setModalTab('create');
      }
      setEditRoomName(currentRoom || '');
      setEditCurrentPassword('');
      setEditNewPassword('');
      setEditAddPassword(false);
      setEditAction('keep');
      setEditError('');
      setEditSuccess('');

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, initialTab, currentRoom, onClose]);

  if (!isOpen) return null;

  const generateRandomRoomName = (target = 'create') => {
    sounds.playClick();
    const adjectives = ['cyber', 'stealth', 'quantum', 'shadow', 'nexus', 'sonic', 'phantom', 'cosmic', 'hyper', 'aurora', 'solar', 'velvet'];
    const nouns = ['vault', 'matrix', 'sanctum', 'bunker', 'haven', 'node', 'channel', 'relay', 'beacon', 'prism'];
    const num = Math.floor(100 + Math.random() * 900);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const generated = `${adj}-${noun}-${num}`;

    if (target === 'create') {
      setCreateRoomName(generated);
    } else {
      setEditRoomName(generated);
    }
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    const cleanNewName = editRoomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanNewName) {
      setEditError('Room name cannot be empty.');
      return;
    }

    if (!onEditRoom) {
      setEditError('Room editing is not configured.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      let newPass = null;
      let isRemoving = false;

      if (!isRoomProtected) {
        // Room was open
        if (editAddPassword) {
          if (!editNewPassword.trim()) {
            setEditError('Please enter a password to protect this room.');
            setIsSubmittingEdit(false);
            return;
          }
          newPass = editNewPassword.trim();
        }
      } else {
        // Room was protected
        if (!editCurrentPassword.trim()) {
          setEditError('Current room password is required to verify your authority.');
          setIsSubmittingEdit(false);
          return;
        }

        if (editAction === 'remove') {
          isRemoving = true;
          newPass = null;
        } else if (editAction === 'change') {
          if (!editNewPassword.trim()) {
            setEditError('Please enter the new password.');
            setIsSubmittingEdit(false);
            return;
          }
          newPass = editNewPassword.trim();
        } else {
          // keep existing password
          newPass = editCurrentPassword.trim();
        }
      }

      const result = await onEditRoom({
        oldRoom: currentRoom,
        newRoom: cleanNewName,
        currentPassword: editCurrentPassword.trim(),
        newPassword: newPass,
        isRemovingPassword: isRemoving
      });

      if (result && result.success === false) {
        setEditError(result.error || 'Failed to update room details.');
      } else {
        setEditSuccess('Room details updated successfully!');
        sounds.playSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setEditError(err.message || 'An error occurred while updating room.');
    } finally {
      setIsSubmittingEdit(false);
    }
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
            <p>Create, join, or customize private rooms with custom keys & password protection</p>
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
                <div className="current-room-pills-row">
                  <span className="current-room-badge-pill">
                    {isRoomProtected ? '🔒 Password Protected' : '🔓 Open Room'}
                  </span>
                  {isRoomProtected && roomPassword && (
                    <span className="current-room-pass-badge">
                      Key: {showBannerPassword ? roomPassword : '••••••••'}
                      <button 
                        type="button" 
                        className="btn-mini-eye ml-1"
                        onClick={() => setShowBannerPassword(!showBannerPassword)}
                        title={showBannerPassword ? 'Hide password' : 'Show password'}
                      >
                        {showBannerPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="current-room-actions">
              <button 
                type="button" 
                className={`btn-edit-room-toggle ${modalTab === 'edit' ? 'btn-active-edit' : ''}`}
                onClick={() => {
                  sounds.playClick();
                  setModalTab('edit');
                }}
                title="Edit Room ID and Password"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>

              <button 
                type="button" 
                className="btn-copy-room-link"
                onClick={handleCopyLink}
                title="Copy Room Invitation Link"
              >
                {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
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
                <LogOut size={13} />
                <span>Leave</span>
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

        {/* Sub-Tabs: Edit Room (if active) | Create Room | Join Room */}
        {/* Sub-Tabs: Edit Room (if active) | Create Room | Join Room */}
        <div className="room-modal-tabs">
          {currentRoom && (
            <button
              type="button"
              className={`room-modal-tab ${modalTab === 'edit' ? 'tab-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setModalTab('edit');
              }}
            >
              <Edit3 size={14} className="flex-shrink-0" />
              <span className="tab-text-full">Edit Room</span>
              <span className="tab-text-short">Edit</span>
              <span className="tab-chip-active">Active</span>
            </button>
          )}

          <button
            type="button"
            className={`room-modal-tab ${modalTab === 'create' ? 'tab-active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setModalTab('create');
            }}
          >
            <Sparkles size={14} className="flex-shrink-0" />
            <span className="tab-text-full">Create Room</span>
            <span className="tab-text-short">Create</span>
          </button>

          <button
            type="button"
            className={`room-modal-tab ${modalTab === 'join' ? 'tab-active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setModalTab('join');
            }}
          >
            <ArrowRight size={14} className="flex-shrink-0" />
            <span className="tab-text-full">Join Room</span>
            <span className="tab-text-short">Join</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* Tab: Edit Room Details                                          */}
        {/* ============================================================== */}
        {modalTab === 'edit' && currentRoom && (
          <form onSubmit={handleEditSubmit} className="room-form">
            {editError && (
              <div className="room-form-alert alert-error">
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="room-form-alert alert-success">
                <Check size={16} />
                <span>{editSuccess}</span>
              </div>
            )}

            {/* Edit Room Name / ID */}
            <div className="input-group">
              <label className="input-label">Edit Room ID / Name:</label>
              <div className="room-input-row">
                <div className="room-prefix-box">
                  <span className="room-prefix-domain">intekchat.com/</span>
                  <span className="room-prefix-short">#/</span>
                </div>
                <input
                  type="text"
                  className="modal-text-input room-name-input"
                  placeholder="e.g. secret-meeting-42"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                />
                <button
                  type="button"
                  className="btn-random-room"
                  onClick={() => generateRandomRoomName('edit')}
                  title="Generate Random Memorable Name"
                >
                  <Sparkles size={14} className="flex-shrink-0" />
                  <span className="btn-random-label">Random</span>
                </button>
              </div>
              <span className="input-hint">Changing Room ID will migrate all connected peers in real time.</span>
            </div>

            {/* Password Management */}
            {!isRoomProtected ? (
              /* Case 1: Room currently has NO password -> Add password option */
              <div className={`password-protect-card ${editAddPassword ? 'protect-active' : ''}`}>
                <div className="protect-toggle-header">
                  <div className="protect-title-group">
                    <div className={`protect-icon-circle ${editAddPassword ? 'icon-locked' : ''}`}>
                      {editAddPassword ? <Lock size={16} className="text-pink" /> : <Unlock size={16} className="text-dim" />}
                    </div>
                    <div>
                      <span className="protect-title">
                        Add Password Protection
                        {editAddPassword && <span className="protect-status-badge">PROTECTING</span>}
                      </span>
                      <span className="protect-subtitle">
                        {editAddPassword 
                          ? 'Zero-Knowledge PBKDF2 salting will be added' 
                          : 'Currently open to anyone with the link. Add a password to restrict access.'}
                      </span>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={editAddPassword}
                      onChange={(e) => setEditAddPassword(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {editAddPassword && (
                  <div className="password-field-container">
                    <label className="input-label">New Room Password:</label>
                    <div className="password-input-wrap">
                      <Key size={16} className="input-lock-icon" />
                      <input
                        type={showEditNewPassword ? 'text' : 'password'}
                        className="modal-text-input password-text-input"
                        placeholder="Enter password to secure this room..."
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        required={editAddPassword}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                        tabIndex={-1}
                      >
                        {showEditNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="password-tip">
                      <ShieldCheck size={13} className="text-cyan" />
                      <span>Peers already in this room will re-derive encryption keys with this new password.</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Case 2: Room is ALREADY password-protected -> Change or remove password */
              <div className="edit-protected-box">
                <div className="protected-banner-status">
                  <Lock size={16} className="text-pink" />
                  <div className="status-meta">
                    <span className="status-meta-title">Room is Password Protected</span>
                    <span className="status-meta-sub">Verify your existing password to modify credentials</span>
                  </div>
                </div>

                {/* Current Password Verification */}
                <div className="input-group">
                  <label className="input-label">Current Room Password (Required):</label>
                  <div className="password-input-wrap">
                    <Key size={16} className="input-lock-icon" />
                    <input
                      type={showEditCurrentPassword ? 'text' : 'password'}
                      className="modal-text-input password-text-input"
                      placeholder="Enter existing password to verify..."
                      value={editCurrentPassword}
                      onChange={(e) => setEditCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowEditCurrentPassword(!showEditCurrentPassword)}
                      tabIndex={-1}
                    >
                      {showEditCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Action Choices: Keep, Change, or Remove */}
                <div className="edit-action-selector">
                  <label className="input-label">Password Action:</label>
                  <div className="edit-action-grid">
                    <button
                      type="button"
                      className={`edit-action-pill ${editAction === 'keep' ? 'pill-selected' : ''}`}
                      onClick={() => setEditAction('keep')}
                    >
                      <Lock size={13} />
                      <span>Keep Current Password</span>
                    </button>

                    <button
                      type="button"
                      className={`edit-action-pill ${editAction === 'change' ? 'pill-selected' : ''}`}
                      onClick={() => setEditAction('change')}
                    >
                      <RefreshCw size={13} />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      className={`edit-action-pill ${editAction === 'remove' ? 'pill-selected text-pink' : ''}`}
                      onClick={() => setEditAction('remove')}
                    >
                      <Unlock size={13} />
                      <span>Remove Password</span>
                    </button>
                  </div>
                </div>

                {/* If Changing Password */}
                {editAction === 'change' && (
                  <div className="input-group mt-3">
                    <label className="input-label">New Room Password:</label>
                    <div className="password-input-wrap">
                      <Key size={16} className="input-lock-icon text-accent" />
                      <input
                        type={showEditNewPassword ? 'text' : 'password'}
                        className="modal-text-input password-text-input"
                        placeholder="Set new room password..."
                        value={editNewPassword}
                        onChange={(e) => setEditNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                        tabIndex={-1}
                      >
                        {showEditNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* If Removing Password Warning */}
                {editAction === 'remove' && (
                  <div className="password-warning-box">
                    <ShieldAlert size={15} className="text-pink" />
                    <span>Removing the password makes this room open to any peer with the link.</span>
                  </div>
                )}
              </div>
            )}

            {/* Leave Room Option in Room Details Section */}
            <div className="leave-room-section-card">
              <div className="leave-room-section-info">
                <div className="leave-room-icon-wrap">
                  <LogOut size={16} className="text-pink" />
                </div>
                <div className="leave-room-text">
                  <span className="leave-room-title">Leave This Room</span>
                  <span className="leave-room-desc">Disconnect from #{currentRoom} and return to Local Wi-Fi network</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-leave-room-action"
                onClick={() => {
                  sounds.playClick();
                  onLeaveRoom();
                  onClose();
                }}
                disabled={isSubmittingEdit}
                title="Leave room and return to default network"
              >
                <LogOut size={13} />
                <span>Leave Room</span>
              </button>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmittingEdit}>
                <span>Cancel</span>
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isSubmittingEdit || !editRoomName.trim()}
              >
                {isSubmittingEdit ? <RefreshCw size={15} className="spin-animation" /> : <Check size={15} />}
                <span>{isSubmittingEdit ? 'Saving...' : 'Save & Update Room'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* Tab: Create New Room                                           */}
        {/* ============================================================== */}
        {modalTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="room-form">
            <div className="input-group">
              <label className="input-label">Unique Room Name:</label>
              <div className="room-input-row">
                <div className="room-prefix-box">
                  <span className="room-prefix-domain">intekchat.com/</span>
                  <span className="room-prefix-short">#/</span>
                </div>
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
                  onClick={() => generateRandomRoomName('create')}
                  title="Generate Random Memorable Name"
                >
                  <Sparkles size={14} className="flex-shrink-0" />
                  <span className="btn-random-label">Random</span>
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
                    <span>Only people with this password can unlock and read your chat messages and files.</span>
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

        {/* ============================================================== */}
        {/* Tab: Join Room                                                 */}
        {/* ============================================================== */}
        {modalTab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="room-form">
            <div className="input-group">
              <label className="input-label">Enter Room Name to Join:</label>
              <div className="room-input-row">
                <div className="room-prefix-box">
                  <span className="room-prefix-domain">intekchat.com/</span>
                  <span className="room-prefix-short">#/</span>
                </div>
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
              <span className="input-hint">If this room has a password, enter it here or unlock when prompted.</span>
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
