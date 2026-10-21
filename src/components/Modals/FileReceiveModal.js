'use client';

import React from 'react';
import { Download, CheckCircle, FileText, X } from 'lucide-react';
import { formatBytes } from '@/lib/peer';
import { sounds } from '@/lib/sound';

export default function FileReceiveModal({ fileData, onClose }) {
  if (!fileData) return null;

  const handleDownload = () => {
    sounds.playClick();
    const a = document.createElement('a');
    a.href = fileData.url;
    a.download = fileData.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card receive-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="receive-success-icon">
              <CheckCircle size={24} className="text-emerald" />
            </div>
            <div>
              <h3>File Received!</h3>
              <p>From: <strong>{fileData.senderName || 'Anonymous Peer'}</strong></p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="receive-file-box">
          <div className="receive-file-icon">
            <FileText size={32} className="text-cyan" />
          </div>
          <div className="receive-file-meta">
            <span className="receive-filename" title={fileData.name}>{fileData.name}</span>
            <span className="receive-filesize">{formatBytes(fileData.size)}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Dismiss
          </button>
          <button type="button" className="btn-primary" onClick={handleDownload}>
            <Download size={16} />
            <span>Save to Disk</span>
          </button>
        </div>
      </div>
    </div>
  );
}
