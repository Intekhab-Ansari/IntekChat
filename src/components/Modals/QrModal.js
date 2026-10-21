'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, ShieldCheck } from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function QrModal({ isOpen, onClose, roomName }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setShareUrl(url);

      if (isOpen && canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          url,
          {
            width: 220,
            margin: 2,
            color: {
              dark: '#06b6d4',
              light: '#0b1120'
            }
          },
          (err) => {
            if (err) console.error('Failed to generate QR code', err);
          }
        );
      }
    }
  }, [isOpen, roomName]);

  if (!isOpen) return null;

  const handleCopy = () => {
    sounds.playClick();
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>Pair Devices or Share Room</h3>
            <p>Scan with your phone camera or share this link</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="qr-container">
          <div className="qr-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="share-url-box">
          <input type="text" readOnly value={shareUrl} className="share-url-input" />
          <button className="btn-copy-link" onClick={handleCopy}>
            {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="qr-footer-notice">
          <ShieldCheck size={14} className="text-cyan" />
          <span>No apps to install. No accounts needed. Instant P2P connection.</span>
        </div>
      </div>
    </div>
  );
}
