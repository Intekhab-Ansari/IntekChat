'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Key, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Hash, 
  Smartphone, 
  Info,
  ExternalLink,
  Zap
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function QrModal({ 
  isOpen, 
  onClose, 
  roomName, 
  roomPassword = '', 
  isRoomProtected = false 
}) {
  const canvasRef = useRef(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [includePasswordInQr, setIncludePasswordInQr] = useState(true);
  const [customHost, setCustomHost] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      setIsLocalhost(isLocal);

      // Build target base URL
      const origin = customHost.trim() ? customHost.trim() : window.location.origin;
      const cleanRoom = (roomName || '').trim().toLowerCase().replace(/\s+/g, '-');
      
      let target = `${origin}/?tab=chat`;
      if (cleanRoom) {
        target += `&room=${encodeURIComponent(cleanRoom)}`;
        if (isRoomProtected && roomPassword && includePasswordInQr) {
          target += `&pwd=${encodeURIComponent(roomPassword)}`;
        }
      }

      setShareUrl(target);

      if (isOpen && canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          target,
          {
            width: 230,
            margin: 2,
            color: {
              dark: '#3b82f6',
              light: '#ffffff'
            }
          },
          (err) => {
            if (err) console.error('Failed to generate QR code', err);
          }
        );
      }

      if (isOpen) {
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }
    }
  }, [isOpen, roomName, roomPassword, isRoomProtected, includePasswordInQr, customHost, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const handleCopyRoom = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      const cleanRoom = (roomName || '').trim().toLowerCase().replace(/\s+/g, '-');
      navigator.clipboard.writeText(cleanRoom).then(() => {
        setCopiedRoom(true);
        setTimeout(() => setCopiedRoom(false), 2000);
      });
    }
  };

  const handleCopyPassword = () => {
    sounds.playClick();
    if (typeof window !== 'undefined' && roomPassword) {
      navigator.clipboard.writeText(roomPassword).then(() => {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      });
    }
  };

  const handleNativeShare = async () => {
    sounds.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join room #${roomName} on IntekChat`,
          text: isRoomProtected && roomPassword
            ? `Join my private encrypted room #${roomName} on IntekChat! Room Password: ${roomPassword}`
            : `Join my private encrypted room #${roomName} on IntekChat!`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              <Smartphone size={15} className="text-accent" />
              <span>Mobile Scanner & Invite</span>
            </div>
            <h3>Join Room with Camera Scanner</h3>
            <p>Scan with any phone camera or barcode scanner to join instantly</p>
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

        {/* Room Credentials Summary Box (Room ID & Password) */}
        <div className="room-credentials-card">
          {/* Room ID row */}
          <div className="credential-row">
            <div className="credential-left">
              <div className="credential-icon-circle">
                <Hash size={14} className="text-cyan" />
              </div>
              <div className="credential-meta">
                <span className="credential-label">Room ID / Name</span>
                <span className="credential-value font-mono">#{roomName || 'local-wifi'}</span>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-credential-copy"
              onClick={handleCopyRoom}
              title="Copy Room ID"
            >
              {copiedRoom ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              <span>{copiedRoom ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Password row */}
          <div className="credential-row">
            <div className="credential-left">
              <div className={`credential-icon-circle ${isRoomProtected ? 'icon-circle-locked' : ''}`}>
                {isRoomProtected ? <Lock size={14} className="text-pink" /> : <Unlock size={14} className="text-dim" />}
              </div>
              <div className="credential-meta">
                <span className="credential-label">Room Password</span>
                {isRoomProtected ? (
                  <span className="credential-value font-mono text-accent">
                    {showPassword ? roomPassword : '••••••••••••'}
                  </span>
                ) : (
                  <span className="credential-value text-dim text-sm">Open (No password required)</span>
                )}
              </div>
            </div>

            {isRoomProtected && (
              <div className="credential-btn-group">
                <button 
                  type="button" 
                  className="btn-credential-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button 
                  type="button" 
                  className="btn-credential-copy"
                  onClick={handleCopyPassword}
                  title="Copy Password"
                >
                  {copiedPassword ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1-Scan Auto Unlock Option (If Protected) */}
        {isRoomProtected && (
          <div className="qr-auto-unlock-toggle">
            <label className="auto-unlock-label">
              <input
                type="checkbox"
                checked={includePasswordInQr}
                onChange={(e) => setIncludePasswordInQr(e.target.checked)}
                className="auto-unlock-checkbox"
              />
              <div className="auto-unlock-text">
                <span className="auto-unlock-title">
                  <Zap size={13} className="text-amber" />
                  <span>1-Scan Auto Join (Embed Password in QR)</span>
                </span>
                <span className="auto-unlock-desc">
                  {includePasswordInQr
                    ? 'Scanner will unlock & decrypt instantly without asking for password.'
                    : 'Scanner will prompt for password upon entry.'}
                </span>
              </div>
            </label>
          </div>
        )}

        {/* QR Code Graphic Container */}
        <div className="qr-container">
          <div className="qr-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Localhost LAN Warning (Helps users testing between PC & Phone locally) */}
        {isLocalhost && (
          <div className="localhost-lan-tip">
            <Info size={14} className="text-cyan flex-shrink-0" />
            <div className="lan-tip-text">
              <span>Scanning from a phone on the same Wi-Fi? Replace <code>localhost</code> with your PC's Wi-Fi IP (e.g. <code>http://192.168.1.132:3000</code>) so your phone can reach this server.</span>
              <div className="custom-host-input-wrap">
                <input
                  type="text"
                  placeholder="e.g. http://192.168.1.132:3000"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="custom-host-input"
                />
                {customHost ? (
                  <button type="button" className="btn-clear-host" onClick={() => setCustomHost('')}>
                    Reset
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn-credential-copy" 
                    onClick={() => setCustomHost('http://192.168.1.132:3000')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Set My Wi-Fi IP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Link Row */}
        <div className="share-url-box">
          <input type="text" readOnly value={shareUrl} className="share-url-input" />
          <button type="button" className="btn-copy-link" onClick={handleCopyLink}>
            {copiedLink ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="qr-modal-footer">
          <button type="button" className="btn-native-share" onClick={handleNativeShare}>
            <Share2 size={15} />
            <span>Share Room Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
