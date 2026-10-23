'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Hash, 
  Smartphone, 
  Camera,
  Upload,
  RefreshCw,
  Zap,
  Info,
  Radio,
  MessageSquare,
  FileUp,
  AlertCircle,
  VideoOff,
  ArrowRight
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function QrModal({ 
  isOpen, 
  onClose, 
  roomName, 
  roomPassword = '', 
  isRoomProtected = false,
  activeTab = 'drop',
  onJoinScannedRoom,
  dropPairId = '',
  userProfile = null,
  peers = [],
  initialMode = 'show'
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanAnimFrameRef = useRef(null);
  const streamRef = useRef(null);
  const peerCountOnOpenRef = useRef(0);

  // Modal display mode: 'show' (displaying QR) or 'scan' (camera scanner)
  const [modalMode, setModalMode] = useState(initialMode || 'show'); // 'show' | 'scan'
  const isDrop = activeTab === 'drop';

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [includePasswordInQr, setIncludePasswordInQr] = useState(true);
  const [customHost, setCustomHost] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);

  // Camera Scanner States
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [cameraError, setCameraError] = useState('');
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFailedBanner, setRetryFailedBanner] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Reset scanner state when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalMode(initialMode || 'show');
      setScannedResult(null);
      setCameraError('');
      setIsPermissionDenied(false);
      setIsRetrying(false);
      setRetryFailedBanner(false);
      setManualCodeInput('');
      peerCountOnOpenRef.current = (peers || []).length;
    }
  }, [isOpen, initialMode, peers]);

  // Auto-dismiss modal ONLY when a NEW peer joins while in Show QR mode
  useEffect(() => {
    if (isOpen && isDrop && modalMode === 'show' && peers && peers.length > peerCountOnOpenRef.current) {
      const timer = setTimeout(() => {
        onClose();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDrop, modalMode, peers, onClose]);

  // Generate QR Code URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      setIsLocalhost(isLocal);

      // Build target base URL
      const origin = customHost.trim() ? customHost.trim() : window.location.origin;
      const cleanRoom = (roomName || '').trim().toLowerCase().replace(/\s+/g, '-');
      
      let target = '';
      if (isDrop) {
        // Pure IntekDrop P2P pairing link - Each device has its OWN unique barcode based on userProfile.id!
        const myDeviceId = (userProfile?.id || '').trim();
        let pairId = myDeviceId;
        if (!pairId) {
          try {
            const saved = localStorage.getItem('intekchat_profile');
            if (saved) pairId = JSON.parse(saved).id || '';
          } catch {}
        }
        if (!pairId) {
          pairId = (dropPairId || '').trim();
        }
        target = `${origin}/?tab=drop${pairId ? `&pair=${encodeURIComponent(pairId)}` : ''}`;
      } else {
        // IntekChat Room share link
        target = `${origin}/?tab=chat`;
        if (cleanRoom) {
          target += `&room=${encodeURIComponent(cleanRoom)}`;
          if (isRoomProtected && roomPassword && includePasswordInQr) {
            target += `&pwd=${encodeURIComponent(roomPassword)}`;
          }
        }
      }

      setShareUrl(target);

      if (isOpen && modalMode === 'show' && canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          target,
          {
            width: 230,
            margin: 2,
            color: {
              dark: isDrop ? '#06b6d4' : '#3b82f6',
              light: '#ffffff'
            }
          },
          (err) => {
            if (err) console.error('Failed to generate QR code', err);
          }
        );
      }
    }
  }, [isOpen, modalMode, isDrop, roomName, roomPassword, isRoomProtected, includePasswordInQr, customHost, dropPairId, userProfile]);

  // Stop camera stream utility
  const stopCamera = useCallback(() => {
    if (scanAnimFrameRef.current) {
      cancelAnimationFrame(scanAnimFrameRef.current);
      scanAnimFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Handle scanned URL or plain text
  const handleScannedData = useCallback((data) => {
    if (!data) return;
    try {
      sounds.playJoin();
    } catch {}

    let room = '';
    let pwd = '';
    let pair = '';
    let tab = isDrop ? 'drop' : 'chat';

    // Parse potential URL
    try {
      if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('/')) {
        const url = new URL(data, window.location.origin);
        pair = url.searchParams.get('pair') || '';
        room = url.searchParams.get('room') || '';
        pwd = url.searchParams.get('pwd') || url.searchParams.get('pass') || url.searchParams.get('password') || '';
        tab = url.searchParams.get('tab') || (pair ? 'drop' : (room ? 'chat' : (isDrop ? 'drop' : 'chat')));
      } else {
        // Plain text room code or pair ID
        if (isDrop) {
          pair = data.trim();
          tab = 'drop';
        } else {
          room = data.trim();
          tab = 'chat';
        }
      }
    } catch {
      if (isDrop) {
        pair = data.trim();
        tab = 'drop';
      } else {
        room = data.trim();
        tab = 'chat';
      }
    }

    setScannedResult({ room, tab, pwd, pair });
    stopCamera();

    // Call join callback
    if (onJoinScannedRoom) {
      onJoinScannedRoom({ room, pwd, tab, pair });
    }

    // Auto-close modal after brief confirmation
    setTimeout(() => {
      onClose();
    }, 700);
  }, [isDrop, onJoinScannedRoom, onClose, stopCamera]);

  // Start Camera Scanning Loop
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError('');
    setScannedResult(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsPermissionDenied(false);
      setCameraError('');
      setRetryFailedBanner(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);

        // Canvas for decoding frames
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanLoop = () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            scanAnimFrameRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          if (canvas.width > 0 && canvas.height > 0 && ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
              handleScannedData(code.data);
              return; // Stop scanning loop on success
            }
          }

          scanAnimFrameRef.current = requestAnimationFrame(scanLoop);
        };

        scanAnimFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setCameraError('Camera permission denied.');
        setRetryFailedBanner(true);
      } else {
        setIsPermissionDenied(false);
        setCameraError(err.message || 'Unable to access camera.');
      }
      setIsCameraActive(false);
    }
  }, [cameraFacing, stopCamera, handleScannedData]);

  const handleRetryCamera = async () => {
    sounds.playClick();
    setIsRetrying(true);
    try {
      await startCamera();
    } catch (err) {
      console.warn('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleManualPairSubmit = (e) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    sounds.playClick();
    handleScannedData(manualCodeInput.trim());
  };

  // Listen to browser camera permission changes dynamically
  useEffect(() => {
    let permStatus = null;
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        navigator.permissions.query({ name: 'camera' }).then((status) => {
          permStatus = status;
          if (status.state === 'denied') {
            setIsPermissionDenied(true);
          } else if (status.state === 'granted') {
            setIsPermissionDenied(false);
          }
          status.onchange = () => {
            if (status.state === 'granted') {
              setIsPermissionDenied(false);
              setCameraError('');
              if (isOpen && modalMode === 'scan') {
                startCamera();
              }
            } else if (status.state === 'denied') {
              setIsPermissionDenied(true);
            }
          };
        }).catch(() => {});
      } catch {}
    }
    return () => {
      if (permStatus) permStatus.onchange = null;
    };
  }, [isOpen, modalMode, startCamera]);

  // Manage camera on modal open/mode change
  useEffect(() => {
    if (isOpen && modalMode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, modalMode, startCamera, stopCamera]);

  // Handle uploaded image fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleScannedData(code.data);
          } else {
            setCameraError('No QR code detected in this image. Try another screenshot.');
          }
        }
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  // Keyboard escape
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          stopCamera();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, stopCamera]);

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
        const title = isDrop ? 'Pair with IntekDrop' : `Join room #${roomName} on IntekChat`;
        const text = isDrop
          ? 'Connect with my device on IntekDrop to transfer files instantly!'
          : (isRoomProtected && roomPassword
              ? `Join my private room #${roomName} on IntekChat! Room Password: ${roomPassword}`
              : `Join my private room #${roomName} on IntekChat!`);
        await navigator.share({
          title,
          text,
          url: shareUrl
        });
      } catch (err) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => { stopCamera(); onClose(); }}>
      <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-badge">
              {isDrop ? (
                <>
                  <Radio size={15} className="text-cyan animate-pulse" />
                  <span>IntekDrop P2P Device Pairing</span>
                </>
              ) : (
                <>
                  <MessageSquare size={15} className="text-accent" />
                  <span>IntekChat Private Room Share</span>
                </>
              )}
            </div>
            <h3>
              {modalMode === 'scan' 
                ? 'Live Camera QR Scanner'
                : (isDrop ? 'Pair Devices & Drop Files' : (roomName ? `Share Room #${roomName}` : 'Share Chat Room'))}
            </h3>
            <p>
              {modalMode === 'scan'
                ? 'Point your camera at another device to sync instantly'
                : (isDrop
                    ? 'Scan with another phone or PC to pair devices on IntekDrop Radar and drop files instantly'
                    : 'Scan to open and join this end-to-end encrypted room directly in IntekChat')}
            </p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={() => { stopCamera(); onClose(); }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher Tabs: Show QR vs Camera Scanner */}
        <div className="qr-mode-tabs">
          <button
            type="button"
            className={`btn-qr-mode-tab ${modalMode === 'show' ? 'active' : ''}`}
            onClick={() => {
              sounds.playClick();
              stopCamera();
              setModalMode('show');
            }}
          >
            <Smartphone size={15} />
            <span>Show QR Code</span>
          </button>
          <button
            type="button"
            className={`btn-qr-mode-tab ${modalMode === 'scan' ? 'active' : ''}`}
            onClick={() => {
              sounds.playClick();
              setModalMode('scan');
            }}
          >
            <Camera size={15} />
            <span>Scan with Camera</span>
          </button>
        </div>

        {/* ---------------- MODE 1: SHOW QR CODE ---------------- */}
        {modalMode === 'show' && (
          <>
            {/* If IntekDrop mode: Clean AirDrop-style P2P Pair Card (No Room ID, Password, or Chat Buttons!) */}
            {isDrop ? (
              <>
                {peers && peers.length > 0 && (
                  <div className="intekdrop-connected-banner">
                    <Check size={16} className="text-emerald" />
                    <span>Device Connected: <strong>{peers[0].name}</strong> ({peers[0].os?.toUpperCase() || 'DEVICE'})</span>
                  </div>
                )}
                <div className="intekdrop-pair-banner">
                  <div className="intekdrop-pair-icon">
                    <Radio size={18} className="text-cyan animate-pulse" />
                  </div>
                  <div className="intekdrop-pair-text">
                    <span className="intekdrop-pair-title">Device Barcode: {userProfile?.name || 'This Device'}</span>
                    <span className="intekdrop-pair-desc">
                      Scan with another phone or PC to pair directly with {userProfile?.name || 'this device'}.
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* If IntekChat mode: Show Room ID and Password credentials */
              <>
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
                            ? 'Scanner will unlock & connect instantly without asking for password.'
                            : 'Scanner will prompt for password upon entry.'}
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* QR Code Graphic Container */}
            <div className="qr-container">
              <div className="qr-canvas-wrap">
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* Localhost LAN Warning */}
            {isLocalhost && (
              <div className="localhost-lan-tip">
                <Info size={14} className="text-cyan flex-shrink-0" />
                <div className="lan-tip-text">
                  <span>Testing between PC &amp; Phone on Wi-Fi? Replace <code>localhost</code> with your PC&apos;s IP (<code>http://192.168.1.132:3000</code>).</span>
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
                        Set Wi-Fi IP
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
                <span>{copiedLink ? 'Copied' : (isDrop ? 'Copy Pairing Link' : 'Copy Room Link')}</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div className="qr-modal-footer">
              <button type="button" className="btn-native-share" onClick={handleNativeShare}>
                <Share2 size={15} />
                <span>{isDrop ? 'Share IntekDrop Link' : 'Share Room Link'}</span>
              </button>
            </div>
          </>
        )}

        {/* ---------------- MODE 2: CAMERA SCANNER ---------------- */}
        {modalMode === 'scan' && (
          <div className="qr-scanner-view">
            {scannedResult ? (
              <div className="qr-scan-success-card">
                <div className="scan-success-icon-wrap">
                  <Check size={32} className="text-emerald" />
                </div>
                <h4>QR Code Recognized!</h4>
                {scannedResult.tab === 'drop' ? (
                  <p>Pairing with <strong>IntekDrop</strong> Radar to transfer files...</p>
                ) : (
                  <p>Joining room <strong>#{scannedResult.room}</strong> in <strong>IntekChat</strong>...</p>
                )}
              </div>
            ) : (
              <>
                <div className="qr-camera-viewport">
                  <video 
                    ref={videoRef} 
                    className="qr-video-feed" 
                    playsInline 
                    autoPlay 
                    muted 
                  />
                  {/* Viewfinder Target Overlay */}
                  <div className="qr-viewfinder-overlay">
                    <div className="qr-viewfinder-box">
                      <div className="qr-laser-line"></div>
                      <div className="viewfinder-corner top-left"></div>
                      <div className="viewfinder-corner top-right"></div>
                      <div className="viewfinder-corner bottom-left"></div>
                      <div className="viewfinder-corner bottom-right"></div>
                    </div>
                    <span className="viewfinder-hint">Align QR code within the frame</span>
                  </div>
                </div>

                {cameraError ? (
                  <div className="camera-permission-card">
                    {retryFailedBanner && (
                      <div className="camera-blocked-callout animate-shake">
                        <div className="callout-header">
                          <span className="callout-arrow">▲</span>
                          <strong>Chrome is still blocking camera access!</strong>
                        </div>
                        <p className="callout-text">
                          Browser security prevents websites from re-opening permission automatically once blocked.
                        </p>
                        <div className="callout-solution">
                          Look at your top browser address bar ➔ Click <strong>camera (🎥⃠)</strong> or <strong>padlock (🔒)</strong> ➔ Change Camera to <strong>Allow</strong> ➔ Click &quot;Try Again&quot;.
                        </div>
                      </div>
                    )}

                    <div className="permission-card-header">
                      <div className="permission-icon-badge">
                        <VideoOff size={20} className="text-pink" />
                      </div>
                      <div className="permission-text-wrap">
                        <h4>Camera Permission Denied</h4>
                        <p>
                          Your browser has blocked camera access for this site. 
                          Browsers remember this block even after refreshing the page.
                        </p>
                      </div>
                    </div>

                    <div className="permission-guide-steps">
                      <span className="guide-steps-title">To grant camera permission:</span>
                      <ol className="permission-steps-list">
                        <li>
                          <span className="step-num">1</span>
                          <span>Click the <strong>camera icon (🎥⃠)</strong> or <strong>padlock (🔒)</strong> in your browser address bar above.</span>
                        </li>
                        <li>
                          <span className="step-num">2</span>
                          <span>Select <strong>&quot;Always allow&quot;</strong> or switch Camera permission to <strong>Allow</strong>.</span>
                        </li>
                        <li>
                          <span className="step-num">3</span>
                          <span>Click the <strong>&quot;Try Again / Request Permission&quot;</strong> button below.</span>
                        </li>
                      </ol>
                    </div>

                    <div className="permission-actions-group">
                      <button
                        type="button"
                        className="btn-permission-primary"
                        onClick={handleRetryCamera}
                        disabled={isRetrying}
                      >
                        <RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} />
                        <span>{isRetrying ? 'Checking Permission...' : 'Try Again / Request Permission'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-permission-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={15} />
                        <span>Upload QR Code Image</span>
                      </button>
                    </div>

                    {/* Manual Code / Link Input Fallback (Works 100% Without Camera) */}
                    <div className="manual-pair-box">
                      <div className="manual-pair-divider">
                        <span>OR CONNECT DIRECTLY</span>
                      </div>
                      <p className="manual-pair-desc">
                        {isDrop 
                          ? 'Paste the other device\'s Pair Code or Link to connect instantly:' 
                          : 'Paste the Room Name or Link to join instantly:'}
                      </p>
                      <form onSubmit={handleManualPairSubmit} className="manual-pair-form">
                        <input
                          type="text"
                          placeholder={isDrop ? 'Paste pair code or link (e.g. shadow-sanctum-983)' : 'Paste room link or name'}
                          value={manualCodeInput}
                          onChange={(e) => setManualCodeInput(e.target.value)}
                          className="manual-pair-input"
                        />
                        <button type="submit" className="btn-manual-pair-submit">
                          <span>Connect</span>
                          <ArrowRight size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Scanner Controls */
                  <>
                    <div className="qr-scanner-controls">
                      <button
                        type="button"
                        className="btn-camera-toggle"
                        onClick={() => {
                          sounds.playClick();
                          setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
                        }}
                      >
                        <RefreshCw size={15} />
                        <span>Flip Camera</span>
                      </button>

                      <button
                        type="button"
                        className="btn-camera-upload"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={15} />
                        <span>Upload QR Image</span>
                      </button>
                    </div>

                    {/* Quick Manual Code Input */}
                    <div className="manual-pair-box manual-pair-compact">
                      <form onSubmit={handleManualPairSubmit} className="manual-pair-form">
                        <input
                          type="text"
                          placeholder={isDrop ? 'Or paste pair code / link directly' : 'Or paste room name / link directly'}
                          value={manualCodeInput}
                          onChange={(e) => setManualCodeInput(e.target.value)}
                          className="manual-pair-input"
                        />
                        <button type="submit" className="btn-manual-pair-submit">
                          <span>Connect</span>
                          <ArrowRight size={14} />
                        </button>
                      </form>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
