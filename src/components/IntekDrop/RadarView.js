'use client';

import React, { useState, useRef } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  UploadCloud, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Share2,
  QrCode,
  Camera,
  Zap,
  Radio,
  Check
} from 'lucide-react';
import { getAvatarColor, formatBytes } from '@/lib/peer';
import { sounds } from '@/lib/sound';

export default function RadarView({
  peers,
  userProfile,
  onSendFile,
  activeTransfers,
  onCancelTransfer,
  onOpenQr,
  roomName,
  dropPairId = ''
}) {
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [dragOverPeerId, setDragOverPeerId] = useState(null);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [isTipDismissed, setIsTipDismissed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef(null);
  const targetPeerRef = useRef(null);

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      const myId = userProfile?.id || '';
      const url = new URL(window.location.origin);
      url.searchParams.set('tab', 'drop');
      if (myId) {
        url.searchParams.set('pair', myId);
      }
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      sounds.playMessage();
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={22} />;
      case 'tablet':
        return <Tablet size={22} />;
      case 'desktop':
      default:
        return <Laptop size={22} />;
    }
  };

  const handlePeerClick = (peer) => {
    sounds.playClick();
    targetPeerRef.current = peer;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0 && targetPeerRef.current) {
      for (let i = 0; i < files.length; i++) {
        onSendFile(targetPeerRef.current.id, files[i]);
      }
    }
  };

  const handleDragOver = (e, peerId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPeerId(peerId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPeerId(null);
  };

  const handleDrop = (e, peer) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPeerId(null);
    setIsDraggingGlobal(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onSendFile(peer.id, e.dataTransfer.files[i]);
      }
    }
  };

  // Upper-hemisphere positioning: Top -> Right-Top -> Left-Top -> Mid-Right -> Mid-Left (never downside)
  const getPeerPosition = (index, total) => {
    const UPPER_SLOTS = [
      { x: 0, y: -160 },    // 0: Top (Center-Top)
      { x: 110, y: -120 },  // 1: Right-Top
      { x: -110, y: -120 }, // 2: Left-Top
      { x: 140, y: -45 },   // 3: Mid-Right
      { x: -140, y: -45 },  // 4: Mid-Left
      { x: 65, y: -205 },   // 5: Outer Right-Top
      { x: -65, y: -205 },  // 6: Outer Left-Top
      { x: 165, y: -110 },  // 7: Far Right-Top
      { x: -165, y: -110 }, // 8: Far Left-Top
    ];

    if (index < UPPER_SLOTS.length) {
      const slot = UPPER_SLOTS[index];
      return {
        top: `calc(50% + ${slot.y}px)`,
        left: `calc(50% + ${slot.x}px)`,
        transform: 'translate(-50%, -50%)'
      };
    }

    // Procedural upper hemisphere distribution for 9+ devices (strictly y < 0)
    const extra = index - UPPER_SLOTS.length;
    const sign = extra % 2 === 0 ? 1 : -1;
    const step = Math.floor(extra / 2) + 1;
    const angleStep = 0.22;
    const angle = -Math.PI / 2 + sign * (step * angleStep);
    const r = 210;
    const x = Math.round(r * Math.cos(angle));
    const y = -Math.abs(Math.round(r * Math.sin(angle)));

    return {
      top: `calc(50% + ${y}px)`,
      left: `calc(50% + ${x}px)`,
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div 
      className={`radar-container ${isDraggingGlobal ? 'drag-active' : ''}`}
      onDragEnter={() => setIsDraggingGlobal(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.clientX === 0 && e.clientY === 0) setIsDraggingGlobal(false);
      }}
      onDrop={() => setIsDraggingGlobal(false)}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple 
        onChange={handleFileInputChange} 
      />

      {/* Futuristic Radar Waves and Grid Background */}
      <div className="radar-grid">
        <div className="radar-circle radar-circle-1" />
        <div className="radar-circle radar-circle-2" />
        <div className="radar-circle radar-circle-3" />
        <div className="radar-sweep" />
        <div className="radar-axis-h" />
        <div className="radar-axis-v" />
      </div>

      {/* Center Beacon (You / Self Device) */}
      <div className="self-beacon">
        <div className="self-glow" />
        <div className="self-card">
          <div className="self-icon-wrap">
            {getDeviceIcon(userProfile?.deviceType)}
          </div>
          <div className="self-info">
            <span className="self-label">You are known as</span>
            <span className="self-name">{userProfile?.name}</span>
            <span className="self-status">
              <span className="pulse-dot" />
              <span className="desktop-radar-status">
                {peers.length > 0 ? `${peers.length} Device${peers.length > 1 ? 's' : ''} Nearby` : 'Radar Active • Ready to Connect'}
              </span>
              <span className="mobile-radar-status">
                {peers.length > 0 ? `${peers.length} Nearby` : 'Radar Active • Ready'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Orbiting Discovered Peers */}
      {peers.map((peer, idx) => {
        const peerStyle = getAvatarColor(idx + 1);
        const position = getPeerPosition(idx, peers.length);
        const isScannedPair = !!(dropPairId && (peer.id === dropPairId || peer.name?.toLowerCase() === dropPairId.toLowerCase()));
        const isHoveredOrDragged = dragOverPeerId === peer.id || isScannedPair;

        // Check if there is an active transfer with this peer
        const currentTransfer = Object.values(activeTransfers).find(
          (t) => t.peerId === peer.id || t.senderId === peer.id
        );

        return (
          <div
            key={peer.id}
            className={`peer-node ${isHoveredOrDragged ? 'node-highlight' : ''}`}
            style={position}
            onClick={() => handlePeerClick(peer)}
            onDragOver={(e) => handleDragOver(e, peer.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, peer)}
            title="Click or drag files here to send"
          >
            {/* Circular Progress Ring when transferring */}
            {currentTransfer && (
              <svg className="transfer-ring" viewBox="0 0 100 100">
                <circle className="ring-bg" cx="50" cy="50" r="44" />
                <circle 
                  className="ring-progress" 
                  cx="50" 
                  cy="50" 
                  r="44"
                  style={{
                    strokeDasharray: 276.46,
                    strokeDashoffset: 276.46 - (276.46 * currentTransfer.progress) / 100
                  }}
                />
              </svg>
            )}

            <div 
              className="peer-avatar-wrap"
              style={{
                borderColor: peerStyle.border,
                boxShadow: isHoveredOrDragged ? `0 0 25px ${peerStyle.glow}` : `0 0 12px ${peerStyle.glow}`
              }}
            >
              {getDeviceIcon(peer.deviceType)}
            </div>

            <div className="peer-meta">
              <span className="peer-name">{peer.name}</span>
              <span className={`peer-os ${isScannedPair ? 'peer-os-paired' : ''}`}>
                {isScannedPair ? 'PAIRED DEVICE' : (peer.os?.toUpperCase() || 'DEVICE')}
              </span>
            </div>

            {/* Live Speed / Progress Tag */}
            {currentTransfer ? (
              <div className="peer-transfer-pill">
                <Zap size={11} className="text-cyan animate-pulse" />
                <span>{currentTransfer.progress}%</span>
                <span className="peer-speed">
                  ({formatBytes(currentTransfer.speed)}/s)
                </span>
              </div>
            ) : (
              <div className="peer-tap-hint">
                <UploadCloud size={12} />
                <span>Send file</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Persistent floating scan/pair button always available on radar */}
      <button
        type="button"
        className="radar-floating-pair-btn"
        onClick={() => onOpenQr?.('scan')}
        title="Scan QR Code to pair another device"
      >
        <Camera size={15} />
        <span>+ Pair / Scan QR</span>
      </button>

      {/* Quick Drop Action Bar when peers are detected */}
      {peers.length > 0 && (
        <div className="radar-quick-send-bar">
          <button 
            type="button" 
            className="btn-radar-quick-send"
            onClick={() => handlePeerClick(peers[0])}
            title="Send files to discovered peers"
          >
            <UploadCloud size={17} />
            <span>Drop File to {peers.length === 1 ? peers[0].name : `${peers.length} Devices`}</span>
          </button>
          <button
            type="button"
            className="btn-radar-scan-more"
            onClick={() => onOpenQr?.('scan')}
            title="Open scanner to pair another person"
          >
            <Camera size={16} />
            <span>Scan QR / Pair Another</span>
          </button>
          <button
            type="button"
            className="btn-radar-qr-show"
            onClick={() => onOpenQr?.('show')}
            title="Show my QR Code"
          >
            <QrCode size={16} />
            <span>My QR</span>
          </button>
        </div>
      )}

      {/* Sleek Compact Side Helper when no peers on radar */}
      {peers.length === 0 && !isTipDismissed && (
        <aside className="radar-empty-state radar-side-card" aria-label="Nearby Device Discovery">
          <button 
            type="button" 
            className="btn-dismiss-empty"
            onClick={() => setIsTipDismissed(true)}
            title="Hide helper"
            aria-label="Dismiss helper"
          >
            <X size={14} />
          </button>
          <div className="empty-card-header">
            <div className="empty-sonar-icon">
              <div className="ping-ring" />
              <Radio size={15} className="text-cyan animate-pulse" />
            </div>
            <div className="empty-title-group">
              <span className="empty-title">Scanning for Devices</span>
              <span className="empty-subtitle">Radar active & ready to pair</span>
            </div>
          </div>
          <p className="empty-desc">
            Open <strong>IntekDrop</strong> on your other phone or PC to transfer files instantly.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn-secondary btn-compact" onClick={onOpenQr}>
              <QrCode size={14} />
              <span>Show QR</span>
            </button>
            <button 
              type="button" 
              className="btn-primary btn-compact" 
              onClick={handleShareLink}
            >
              {copiedLink ? <Check size={14} className="text-emerald" /> : <Share2 size={14} />}
              <span>{copiedLink ? 'Copied!' : 'Share Link'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* If dismissed, subtle floating reopen pill in the corner */}
      {peers.length === 0 && isTipDismissed && (
        <button
          type="button"
          className="radar-restore-tip-btn"
          onClick={() => setIsTipDismissed(false)}
          title="Show device pairing guide"
        >
          <Radio size={14} className="text-cyan animate-pulse" />
          <span>Nearby Helper</span>
        </button>
      )}

      {/* Floating Active Transfers HUD */}
      {Object.values(activeTransfers).length > 0 && (
        <div className="transfers-hud">
          <div className="hud-header">
            <Zap size={14} className="text-cyan animate-pulse" />
            <span>Active Transfers ({Object.values(activeTransfers).length})</span>
          </div>
          <div className="hud-list">
            {Object.values(activeTransfers).map((transfer) => (
              <div key={transfer.id} className="hud-item">
                <div className="hud-item-main">
                  <div className="hud-item-info">
                    <span className="hud-item-name" title={transfer.fileName}>
                      {transfer.fileName}
                    </span>
                    <span className="hud-item-stats">
                      {formatBytes(transfer.direction === 'send' ? transfer.sentBytes : transfer.receivedBytes)} / {formatBytes(transfer.totalBytes)} • {formatBytes(transfer.speed)}/s
                    </span>
                  </div>

                  <div className="hud-progress-bar">
                    <div 
                      className="hud-progress-fill" 
                      style={{ width: `${transfer.progress}%` }} 
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  className="hud-cancel-btn"
                  onClick={() => {
                    sounds.playClick();
                    onCancelTransfer(transfer.id);
                  }}
                  title="Cancel Transfer"
                  aria-label="Cancel Transfer"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
