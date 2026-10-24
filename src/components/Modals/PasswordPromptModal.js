'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, ArrowRight, AlertCircle } from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function PasswordPromptModal({
  isOpen,
  roomName,
  error,
  onSubmitPassword,
  onCancel
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    sounds.playClick();
    onSubmitPassword(password.trim());
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card password-prompt-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge password-badge">
              <Lock size={15} />
              <span>Password Protected Room</span>
            </div>
            <h3>Room #{roomName}</h3>
            <p>This room requires a password to unlock and view messages.</p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onCancel}
            title="Cancel and return to Local Network"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="password-prompt-form">
          {error && (
            <div className="password-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Enter Room Password:</label>
            <div className="password-input-wrap">
              <Lock size={16} className="input-lock-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="modal-text-input password-text-input"
                placeholder="Type room password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="password-security-note">
            <ShieldCheck size={14} className="text-cyan" />
            <span>Your password is encrypted directly on your device. Zero knowledge is ever stored on any server.</span>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onCancel}
            >
              <span>Cancel</span>
            </button>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={!password.trim()}
            >
              <span>Unlock & Join</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
