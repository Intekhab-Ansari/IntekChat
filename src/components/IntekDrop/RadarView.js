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
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'drop');
      if (dropPairId) {
        url.searchParams.set('pair', dropPairId);
      }
      url.searchParams.delete('room');
      url.searchParams.delete('pwd');
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

  // Radial positioning math for discovered peers
  const getPeerPosition = (index, total) => {
    if (total === 1) {
      return { top: '24%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const radius = 170; // px distance from radar center
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const x = Math.round(radius * Math.cos(angle));
    const y = Math.round(radius * Math.sin(angle));
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
              <span>{peers.length > 0 ? `${peers.length} Device${peers.length > 1 ? 's' : ''} Nearby` : 'Radar Active • P2P Ready'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Orbiting Discovered Peers */}
      {peers.map((peer, idx) => {
        const peerStyle = getAvatarColor(idx + 1);
        const position = getPeerPosition(idx, peers.length);
        const isHoveredOrDragged = dragOverPeerId === peer.id;

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
              <span className="peer-os">{peer.os?.toUpperCase() || 'DEVICE'}</span>
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

                <button 
                  className="hud-cancel-btn"
                  onClick={() => onCancelTransfer(transfer.id)}
                  title="Cancel Transfer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
