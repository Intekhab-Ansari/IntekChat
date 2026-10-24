'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, RefreshCw, User, Laptop, Smartphone, Tablet } from 'lucide-react';
import { generateRandomName, getAvatarColor, savePeerProfile } from '@/lib/peer';
import { sounds } from '@/lib/sound';

export default function ProfileModal({ isOpen, onClose, userProfile, onUpdateProfile }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [selectedColor, setSelectedColor] = useState(userProfile?.colorIndex || 0);

  // Sync state whenever modal is opened or userProfile changes
  useEffect(() => {
    if (isOpen) {
      if (userProfile?.name) {
        setName(userProfile.name);
      }
      if (typeof userProfile?.colorIndex === 'number') {
        setSelectedColor(userProfile.colorIndex);
      }
    }
  }, [isOpen, userProfile]);

  // Support closing modal with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRandomizeName = () => {
    sounds.playClick();
    setName(generateRandomName());
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    sounds.playClick();
    const updated = {
      ...userProfile,
      name: name.trim(),
      colorIndex: selectedColor
    };

    savePeerProfile(updated);
    onUpdateProfile(updated);
    onClose();
  };

  const currentAvatar = getAvatarColor(selectedColor);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>Anonymous Profile</h3>
            <p>Your identity visible to nearby peers in IntekChat</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <div className="avatar-preview-section">
            <div 
              className="large-avatar-circle"
              style={{
                background: currentAvatar.bg,
                borderColor: currentAvatar.border,
                color: currentAvatar.text,
                boxShadow: `0 0 20px ${currentAvatar.glow}`
              }}
            >
              <User size={36} />
            </div>

            <div className="color-swatches">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const swatch = getAvatarColor(idx);
                const isSelected = selectedColor === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`color-swatch ${isSelected ? 'swatch-active' : ''}`}
                    style={{ background: swatch.border }}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedColor(idx);
                    }}
                  >
                    {isSelected && <Check size={12} className="text-black" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Your Codename</label>
            <div className="name-input-wrapper">
              <input
                type="text"
                className="modal-text-input"
                placeholder="Enter your codename..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                required
              />
              <button 
                type="button" 
                className="btn-randomize" 
                onClick={handleRandomizeName}
                title="Generate Random Codename"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="device-info-bar">
            <span>Device: <strong>{userProfile?.os?.toUpperCase()} ({userProfile?.deviceType})</strong></span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
