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
  ShieldAlert,
  QrCode,
  Camera,
  Trash2,
  Clock
} from 'lucide-react';
import { sounds } from '@/lib/sound';

const AUTO_DELETE_OPTIONS = [
  { value: 0, label: 'Off (Manual)' },
  { value: 15, label: '15 Mins' },
  { value: 60, label: '1 Hour' },
  { value: 360, label: '6 Hours' },
  { value: 1440, label: '24 Hours' }
];

export default function RoomModal({
  isOpen,
  onClose,
  currentRoom,
  roomPassword = '',
  isRoomProtected = false,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onDeleteRoom,
  onEditRoom,
  onOpenQr,
  initialTab = null,
  autoDeleteExpiresAt = null
}) {
  const [modalTab, setModalTab] = useState(initialTab || (currentRoom ? 'edit' : 'create')); // 'create' | 'join' | 'edit'
  const [showBannerPassword, setShowBannerPassword] = useState(false);
  
  // Create Room state
  const [createRoomName, setCreateRoomName] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createAutoDelete, setCreateAutoDelete] = useState(0);

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
  const [editAutoDelete, setEditAutoDelete] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Room state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

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
      setShowDeleteConfirm(false);
      setDeletePassword('');
      setDeleteError('');
      setIsDeletingRoom(false);

      if (autoDeleteExpiresAt && autoDeleteExpiresAt > Date.now()) {
        const remMins = Math.max(1, Math.round((autoDeleteExpiresAt - Date.now()) / (60 * 1000)));
        setEditAutoDelete(remMins);
      } else {
        setEditAutoDelete(0);
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, initialTab, currentRoom, autoDeleteExpiresAt, onClose]);

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
    onCreateRoom(cleanName, enablePassword ? createPassword.trim() : null, createAutoDelete);
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
        isRemovingPassword: isRemoving,
        autoDeleteMinutes: editAutoDelete
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

  const handleDeleteRoomSubmit = async (e) => {
    if (e) e.preventDefault();
    setDeleteError('');
    if (!onDeleteRoom) {
      setDeleteError('Room deletion is not configured.');
      return;
    }

    const effectivePass = deletePassword.trim() || editCurrentPassword.trim() || roomPassword || null;
    if (isRoomProtected && !effectivePass) {
      setDeleteError('Room password is required to verify deletion authorization.');
      return;
    }

    setIsDeletingRoom(true);
    try {
      const result = await onDeleteRoom(currentRoom, effectivePass);
      if (result && result.success === false) {
        setDeleteError(result.error || 'Failed to delete room.');
        setIsDeletingRoom(false);
      } else {
        sounds.playBurn();
        onClose();
      }
    } catch (err) {
      setDeleteError(err.message || 'An error occurred while deleting room.');
      setIsDeletingRoom(false);
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
            <p className="room-modal-subtitle">Create or customize private encrypted rooms</p>
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

              <button 
                type="button" 
                className="btn-delete-room-banner"
                onClick={() => {
                  sounds.playClick();
                  setModalTab('edit');
                  setShowDeleteConfirm(true);
                }}
                title="Permanently delete this room"
              >
                <Trash2 size={13} />
                <span>Delete</span>
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

            {/* Auto-Delete Room (Self-Destruct) Settings */}
            <div className="input-group auto-delete-group edit-auto-delete-card">
              <div className="auto-delete-header-row">
                <label className="input-label flex items-center gap-1.5">
                  <Clock size={14} className="text-amber" />
                  <span>Auto-Delete Room (Self-Destruct):</span>
                </label>
                {editAutoDelete > 0 && (
                  <span className="auto-delete-preview-badge">
                    {editAutoDelete < 60 ? `${editAutoDelete}m` : `${Math.round((editAutoDelete / 60) * 10) / 10}h`}
                  </span>
                )}
              </div>
              <div className="auto-delete-pills">
                {AUTO_DELETE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`auto-delete-pill ${editAutoDelete === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setEditAutoDelete(opt.value);
                    }}
                  >
                    {opt.value > 0 && <span className="pill-clock-dot" />}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              <span className="input-hint">
                {editAutoDelete > 0
                  ? `Room will automatically self-destruct and wipe all data in ${editAutoDelete < 60 ? `${editAutoDelete} minutes` : `${Math.round((editAutoDelete / 60) * 10) / 10} hours`}.`
                  : 'Auto-delete is off. Room stays active until manually deleted or empty.'}
              </span>
            </div>

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
                disabled={isSubmittingEdit || isDeletingRoom}
                title="Leave room and return to default network"
              >
                <LogOut size={13} />
                <span>Leave Room</span>
              </button>
            </div>

            {/* Danger Zone: Delete Room Section */}
            <div className="delete-room-section-card">
              <div className="delete-room-section-info">
                <div className="delete-room-icon-wrap">
                  <Trash2 size={16} className="text-pink" />
                </div>
                <div className="delete-room-text">
                  <span className="delete-room-title">Danger Zone: Delete Room</span>
                  <span className="delete-room-desc">Permanently wipe room #{currentRoom}, evict all peers & destroy chat</span>
                </div>
              </div>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  className="btn-delete-room-action"
                  onClick={() => {
                    sounds.playClick();
                    setShowDeleteConfirm(true);
                    setDeleteError('');
                  }}
                  disabled={isSubmittingEdit || isDeletingRoom}
                  title="Permanently delete room"
                >
                  <Trash2 size={13} />
                  <span>Delete Room</span>
                </button>
              ) : null}
            </div>

            {/* Delete Room Confirmation Box */}
            {showDeleteConfirm && (
              <div className="delete-room-confirm-panel">
                <div className="confirm-warning-header">
                  <AlertCircle size={17} className="text-pink flex-shrink-0" />
                  <div className="confirm-warning-text">
                    <strong>Permanently delete room #{currentRoom}?</strong>
                    <p>All active participants will be ejected immediately. Messages, wallpapers, and encryption keys for this room will be destroyed forever.</p>
                  </div>
                </div>

                {deleteError && (
                  <div className="room-form-alert alert-error mt-2">
                    <AlertCircle size={15} />
                    <span>{deleteError}</span>
                  </div>
                )}

                {isRoomProtected && !roomPassword && !editCurrentPassword && (
                  <div className="input-group mt-2">
                    <label className="input-label">Enter Room Password to authorize deletion:</label>
                    <div className="password-input-wrap">
                      <Key size={15} className="input-lock-icon" />
                      <input
                        type={showDeletePassword ? 'text' : 'password'}
                        className="modal-text-input password-text-input"
                        placeholder="Current room password..."
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        tabIndex={-1}
                      >
                        {showDeletePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="confirm-buttons-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError('');
                    }}
                    disabled={isDeletingRoom}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    className="btn-delete-room-confirm"
                    onClick={handleDeleteRoomSubmit}
                    disabled={isDeletingRoom}
                  >
                    {isDeletingRoom ? <RefreshCw size={14} className="spin-animation" /> : <Trash2 size={14} />}
                    <span>{isDeletingRoom ? 'Deleting...' : 'Yes, Delete Room Permanently'}</span>
                  </button>
                </div>
              </div>
            )}

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

            {/* Auto-Delete Room (Self-Destruct) Settings */}
            <div className="input-group auto-delete-group">
              <div className="auto-delete-header-row">
                <label className="input-label flex items-center gap-1.5">
                  <Clock size={14} className="text-amber" />
                  <span>Auto-Delete Room (Self-Destruct):</span>
                </label>
                {createAutoDelete > 0 && (
                  <span className="auto-delete-preview-badge">
                    {createAutoDelete < 60 ? `${createAutoDelete}m` : `${createAutoDelete / 60}h`}
                  </span>
                )}
              </div>
              <div className="auto-delete-pills">
                {AUTO_DELETE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`auto-delete-pill ${createAutoDelete === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setCreateAutoDelete(opt.value);
                    }}
                  >
                    {opt.value > 0 && <span className="pill-clock-dot" />}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              <span className="input-hint">
                {createAutoDelete > 0
                  ? `Room and chats will automatically self-destruct after ${createAutoDelete < 60 ? `${createAutoDelete} minutes` : `${createAutoDelete / 60} hours`} if you forget to leave or delete.`
                  : 'Stays active until manually deleted or until everyone leaves.'}
              </span>
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
            {/* Quick QR Camera Scanner Option */}
            <div className="room-modal-scan-box">
              <button
                type="button"
                className="btn-modal-scan-qr"
                onClick={() => {
                  sounds.playClick();
                  onClose();
                  if (onOpenQr) onOpenQr('scan');
                }}
                title="Scan room QR code from another screen or paper"
              >
                <div className="btn-modal-scan-icon-pulse">
                  <QrCode size={20} className="text-cyan animate-pulse" />
                </div>
                <div className="btn-modal-scan-text">
                  <strong>Scan Room QR Code</strong>
                  <span>Use camera to scan another screen & join instantly</span>
                </div>
                <Camera size={16} className="text-accent flex-shrink-0" />
              </button>
            </div>

            <div className="modal-form-divider">
              <span>or enter room name manually</span>
            </div>

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
              <span className="input-hint">Optional: Enter password if room is protected.</span>
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
