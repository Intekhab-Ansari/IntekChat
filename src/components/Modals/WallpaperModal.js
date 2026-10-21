'use client';

import React, { useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  Check, 
  RotateCcw,
  Sliders,
  Eye
} from 'lucide-react';
import { WALLPAPER_PRESETS, getWallpaperCss } from '@/lib/wallpapers';
import { sounds } from '@/lib/sound';

export default function WallpaperModal({
  isOpen,
  onClose,
  currentWallpaper = 'none',
  customImage = null,
  opacity = 18,
  blur = false,
  onSelectWallpaper,
  onUploadCustom,
  onClearCustom,
  onChangeOpacity,
  onToggleBlur
}) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Wallpaper image must be smaller than 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sounds.playSuccess();
      onUploadCustom(reader.result);
      onSelectWallpaper('custom');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wallpaper-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              <ImageIcon size={16} className="text-cyan" />
              <span>Personalization</span>
            </div>
            <h3>Chat Wallpaper & Patterns</h3>
            <p>Customize the chat background with curated patterns or your own photo</p>
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

        {/* Preset Cards Grid */}
        <div className="wallpaper-presets-scroll">
          <div className="wallpaper-grid">
            {WALLPAPER_PRESETS.map((preset) => {
              const isSelected = currentWallpaper === preset.id;
              const previewStyle = getWallpaperCss(preset.id);

              return (
                <button
                  type="button"
                  key={preset.id}
                  className={`wallpaper-card ${isSelected ? 'wallpaper-active' : ''}`}
                  onClick={() => {
                    sounds.playClick();
                    onSelectWallpaper(preset.id);
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
            <div 
              className={`wallpaper-card custom-card ${currentWallpaper === 'custom' ? 'wallpaper-active' : ''}`}
              onClick={() => {
                if (customImage) {
                  sounds.playClick();
                  onSelectWallpaper('custom');
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
                style={customImage ? {
                  backgroundImage: `url(${customImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                {customImage ? (
                  currentWallpaper === 'custom' && (
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
                  {customImage ? 'Tap to use your photo' : 'Upload any picture'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallpaper Controls (Intensity & Blur) */}
        {currentWallpaper !== 'none' && (
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
                onChange={(e) => onChangeOpacity(Number(e.target.value))}
                className="wallpaper-range-slider"
              />
            </div>

            <div className="control-toggles-row">
              <label className="wallpaper-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={blur} 
                  onChange={(e) => onToggleBlur(e.target.checked)}
                  className="wallpaper-checkbox"
                />
                <span>Soft Background Blur</span>
              </label>

              {customImage && (
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
            onClick={() => {
              sounds.playClick();
              onSelectWallpaper('none');
              onClearCustom?.();
            }}
          >
            <RotateCcw size={14} />
            <span>Reset to Solid</span>
          </button>

          <button 
            type="button" 
            className="btn-primary" 
            onClick={onClose}
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
