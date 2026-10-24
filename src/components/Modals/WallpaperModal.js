'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  Check, 
  RotateCcw,
  Sliders,
  User, 
  Users, 
  Loader2,
  Palette
} from 'lucide-react';
import { WALLPAPER_PRESETS, getWallpaperCss, compressWallpaperImage } from '@/lib/wallpapers';
import { sounds } from '@/lib/sound';

export const THEMES = [
  { id: 'sapphire', name: 'Midnight Sapphire', color: '#3b82f6', desc: 'Deep Slate & Sapphire', previewBg: '#0b1329', border: '#1e3a8a' },
  { id: 'silk', name: 'Silk Daylight', color: '#7c3aed', desc: 'Executive Clean Light Mode', previewBg: '#f8fafc', border: '#cbd5e1' },
  { id: 'cyberpunk', name: 'Neon Cyberpunk', color: '#f43f5e', desc: 'Electric Tokyo Synthwave', previewBg: '#13091f', border: '#831843' },
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b', desc: 'Molten Ember & Terracotta', previewBg: '#1c1308', border: '#78350f' },
  { id: 'amethyst', name: 'Royal Amethyst', color: '#a855f7', desc: 'Midnight Indigo & Violet', previewBg: '#120b24', border: '#581c87' },
  { id: 'emerald', name: 'Cyber Jade', color: '#00f59b', desc: 'Luminous Matrix Obsidian', previewBg: '#081a13', border: '#064e3b' },
  { id: 'obsidian', name: 'Obsidian Stealth', color: '#e4e4e7', desc: 'Pure Carbon & White', previewBg: '#09090b', border: '#27272a' },
  { id: 'frost', name: 'Nordic Frost', color: '#38bdf8', desc: 'Deep Titanium & Arctic Ice', previewBg: '#0b1520', border: '#075985' }
];

export default function WallpaperModal({
  isOpen,
  onClose,
  initialTab = 'theme', // 'theme' | 'wallpaper'
  currentTheme = 'sapphire',
  onSelectTheme,
  currentWallpaper = 'none',
  customImage = null,
  opacity = 18,
  blur = false,
  isRoomActive = false,
  roomName = '',
  onSelectWallpaper,
  onUploadCustom,
  onClearCustom,
  onChangeOpacity,
  onToggleBlur,
  onBroadcastWallpaper
}) {
  const [activeModalTab, setActiveModalTab] = useState(initialTab || 'theme');
  const [applyScope, setApplyScope] = useState('room');
  const [selectedPreset, setSelectedPreset] = useState(currentWallpaper);
  const [localCustomImage, setLocalCustomImage] = useState(customImage);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveModalTab(initialTab || 'theme');
      setApplyScope(isRoomActive ? 'room' : 'local');
      setSelectedPreset(currentWallpaper);
      setLocalCustomImage(customImage);
    }
  }, [isOpen, initialTab, isRoomActive, currentWallpaper, customImage]);

  if (!isOpen) return null;

  const handleThemeClick = (themeId) => {
    sounds.playClick();
    onSelectTheme?.(themeId);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Wallpaper image must be smaller than 25MB');
      return;
    }

    try {
      setIsCompressing(true);
      // Auto-compress and scale to fit WebRTC 64KB & MQTT 256KB limits
      const compressedDataUrl = await compressWallpaperImage(file, 900, 0.70);
      sounds.playSuccess();
      setLocalCustomImage(compressedDataUrl);
      setSelectedPreset('custom');
      onUploadCustom?.(compressedDataUrl);
      onSelectWallpaper?.('custom');
    } catch (err) {
      console.error('Failed to compress custom wallpaper:', err);
      alert('Could not process this image. Please try another image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleApplyDone = async () => {
    sounds.playClick();
    const activeWallpaper = selectedPreset || currentWallpaper;
    let activeCustomImage = localCustomImage || customImage;

    if (activeWallpaper === 'custom' && activeCustomImage && activeCustomImage.length > 70000) {
      try {
        activeCustomImage = await compressWallpaperImage(activeCustomImage, 900, 0.68);
      } catch (e) {}
    }

    if (applyScope === 'room' && isRoomActive && onBroadcastWallpaper) {
      sounds.playSuccess();
      onBroadcastWallpaper({
        wallpaperType: activeWallpaper,
        customImage: activeWallpaper === 'custom' ? activeCustomImage : null,
        opacity,
        blur
      });
    }
    onClose();
  };

  const handleResetSolid = () => {
    sounds.playClick();
    setSelectedPreset('none');
    setLocalCustomImage(null);
    onSelectWallpaper?.('none');
    onClearCustom?.();
    if (applyScope === 'room' && isRoomActive && onBroadcastWallpaper) {
      onBroadcastWallpaper({
        wallpaperType: 'none',
        customImage: null,
        opacity: 18,
        blur: false
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wallpaper-modal-card appearance-unified-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              <Palette size={16} className="text-cyan" />
              <span>Appearance</span>
            </div>
            <h3>Theme & Wallpaper</h3>
            <p>Personalize your color theme and chat wallpaper background</p>
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

        {/* Unified Segmented Mode Switcher (Theme vs Wallpaper) */}
        <div className="appearance-segmented-tabs">
          <button
            type="button"
            className={`appearance-segment-tab ${activeModalTab === 'theme' ? 'active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setActiveModalTab('theme');
            }}
          >
            <Palette size={15} />
            <span>App Color Theme</span>
          </button>

          <button
            type="button"
            className={`appearance-segment-tab ${activeModalTab === 'wallpaper' ? 'active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setActiveModalTab('wallpaper');
            }}
          >
            <ImageIcon size={15} />
            <span>Chat Wallpaper</span>
          </button>
        </div>

        {/* SECTION 1: COLOR THEMES */}
        {activeModalTab === 'theme' && (
          <div className="appearance-theme-section">
            <div className="theme-grid">
              {THEMES.map((t) => {
                const isActive = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-selection-card ${isActive ? 'theme-card-active' : ''}`}
                    onClick={() => handleThemeClick(t.id)}
                    style={{
                      background: t.previewBg,
                      borderColor: isActive ? t.color : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="theme-card-header">
                      <div className="theme-color-indicator" style={{ backgroundColor: t.color, boxShadow: `0 0 12px ${t.color}` }} />
                      {isActive && (
                        <div className="theme-active-pill" style={{ backgroundColor: t.color }}>
                          <Check size={12} className="text-white" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                    <div className="theme-card-details">
                      <span className="theme-title">{t.name}</span>
                      <span className="theme-desc">{t.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
              <button type="button" className="btn-primary" onClick={onClose}>
                <Check size={14} />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: CHAT WALLPAPER */}
        {activeModalTab === 'wallpaper' && (
          <div className="appearance-wallpaper-section">
            {/* Wallpaper Scope Selector */}
            {isRoomActive && (
              <div className="wallpaper-scope-card">
                <div className="scope-header">
                  <span className="scope-title">Apply in #{roomName}:</span>
                </div>
                <div className="scope-toggle-tabs">
                  <button
                    type="button"
                    className={`scope-tab ${applyScope === 'local' ? 'scope-tab-active' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setApplyScope('local');
                    }}
                    title="Only customize your personal chat view"
                  >
                    <User size={13} className="flex-shrink-0" />
                    <span>Just for You</span>
                  </button>
                  <button
                    type="button"
                    className={`scope-tab ${applyScope === 'room' ? 'scope-tab-active' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setApplyScope('room');
                    }}
                    title="Broadcast this wallpaper to everyone in the room"
                  >
                    <Users size={13} className="flex-shrink-0" />
                    <span className="scope-text-full">Everyone in Room</span>
                    <span className="scope-text-short">Everyone</span>
                  </button>
                </div>
                <p className="scope-hint">
                  {applyScope === 'room' 
                    ? `Will broadcast and sync this wallpaper for all participants in #${roomName}.` 
                    : 'Will only customize your own local chat window.'}
                </p>
              </div>
            )}

            {/* Preset Cards Grid */}
            <div className="wallpaper-presets-scroll">
              <div className="wallpaper-grid">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  const previewStyle = getWallpaperCss(preset.id);

                  return (
                    <button
                      type="button"
                      key={preset.id}
                      className={`wallpaper-card ${isSelected ? 'wallpaper-active' : ''}`}
                      onClick={() => {
                        sounds.playClick();
                        setSelectedPreset(preset.id);
                        onSelectWallpaper?.(preset.id);
                      }}
                    >
                      <div 
                        className="wallpaper-preview-box"
                        style={{
                          ...previewStyle,
                          backgroundColor: '#0a1020',
                          opacity: preset.id === 'none' ? 0.4 : 0.85
                        }}
                      >
                        {isSelected && (
                          <div className="wallpaper-check-badge">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <div className="wallpaper-card-meta">
                        <span className="wallpaper-name">{preset.name}</span>
                        <span className="wallpaper-desc">{preset.desc}</span>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Photo Card */}
                {(() => {
                  const activeImg = localCustomImage || customImage;
                  const isCustomActive = selectedPreset === 'custom';
                  return (
                    <div 
                      className={`wallpaper-card custom-card ${isCustomActive ? 'wallpaper-active' : ''}`}
                      onClick={() => {
                        if (activeImg) {
                          sounds.playClick();
                          setSelectedPreset('custom');
                          onSelectWallpaper?.('custom');
                        } else if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange} 
                      />
                      <div 
                        className="wallpaper-preview-box custom-preview-box"
                        style={activeImg ? {
                          backgroundImage: `url(${activeImg})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        } : {}}
                      >
                        {isCompressing ? (
                          <div className="custom-empty-icon animate-pulse">
                            <Loader2 size={22} className="animate-spin text-cyan" />
                            <span style={{ fontSize: '0.7rem' }}>Optimizing...</span>
                          </div>
                        ) : activeImg ? (
                          isCustomActive && (
                            <div className="wallpaper-check-badge">
                              <Check size={14} />
                            </div>
                          )
                        ) : (
                          <div className="custom-empty-icon">
                            <Upload size={22} className="text-cyan" />
                            <span>Upload Image</span>
                          </div>
                        )}
                      </div>
                      <div className="wallpaper-card-meta">
                        <span className="wallpaper-name">Custom Photo</span>
                        <span className="wallpaper-desc">
                          {activeImg ? 'Tap to use your photo' : 'Upload any picture'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Controls (Intensity & Blur) */}
            {selectedPreset !== 'none' && (
              <div className="wallpaper-controls-box">
                <div className="control-slider-row">
                  <div className="control-slider-label">
                    <Sliders size={14} className="text-accent" />
                    <span>Pattern Intensity:</span>
                    <strong>{opacity}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="6" 
                    max="75" 
                    value={opacity} 
                    onChange={(e) => onChangeOpacity?.(Number(e.target.value))}
                    className="wallpaper-range-slider"
                  />
                </div>

                <div className="control-toggles-row">
                  <label className="wallpaper-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={blur} 
                      onChange={(e) => onToggleBlur?.(e.target.checked)}
                      className="wallpaper-checkbox"
                    />
                    <span>Soft Background Blur</span>
                  </label>

                  {(localCustomImage || customImage) && (
                    <button 
                      type="button" 
                      className="btn-replace-custom"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={13} />
                      <span>Change Photo</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleResetSolid}
              >
                <RotateCcw size={14} />
                <span>Reset to Solid</span>
              </button>

              <button 
                type="button" 
                className="btn-primary btn-apply-wallpaper" 
                onClick={handleApplyDone}
              >
                {applyScope === 'room' && isRoomActive ? (
                  <>
                    <Users size={14} />
                    <span>Apply to Everyone</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Apply for You</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
