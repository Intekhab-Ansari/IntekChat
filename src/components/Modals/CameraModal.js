'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  RotateCcw, 
  Flame, 
  Repeat, 
  Infinity as InfinityIcon, 
  Send, 
  Check, 
  Sparkles,
  FlipHorizontal
} from 'lucide-react';
import { sounds } from '@/lib/sound';

export default function CameraModal({
  isOpen,
  onClose,
  onCaptureAndSend,
  initialMode = 'permanent'
}) {
  const [imageMode, setImageMode] = useState(initialMode); // 'once' | 'repeat' | 'permanent'
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (rear) | 'user' (front)
  const [cameraError, setCameraError] = useState('');
  const [isStartingCamera, setIsStartingCamera] = useState(true);
  const [flashAnimation, setFlashAnimation] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop media stream tracks
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start media stream for live viewfinder
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraError('');
    setIsStartingCamera(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser. You can still take photos via your native camera app.');
      setIsStartingCamera(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsStartingCamera(false);
    } catch (err) {
      console.warn('getUserMedia error:', err);
      // Fallback without constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
        setIsStartingCamera(false);
      } catch (fallbackErr) {
        console.warn('Camera access denied or unavailable:', fallbackErr);
        setCameraError('Camera permission was denied or camera is unavailable. Use your device camera app below.');
        setIsStartingCamera(false);
      }
    }
  }, [facingMode, stopCameraStream]);

  // Start camera when modal opens, clean up on close
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setImageMode(initialMode || 'permanent');
      startCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCamera, stopCameraStream, initialMode]);

  // Flip between front & rear camera
  const handleToggleFacingMode = () => {
    sounds.playClick();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture snapshot from live stream
  const handleSnap = () => {
    if (!videoRef.current) return;
    sounds.playCameraSnap();

    // Trigger visual flash animation
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 300);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      // Mirror front camera snapshot to match live viewfinder
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  // Retake photo
  const handleRetake = () => {
    sounds.playClick();
    setCapturedPhoto(null);
    startCamera();
  };

  // Native camera fallback file selection (Android / iOS camera app)
  const handleNativeCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      sounds.playCameraSnap();
      setCapturedPhoto(reader.result);
      stopCameraStream();
    };
    reader.readAsDataURL(file);
  };

  // Send the captured photo
  const handleConfirmSend = () => {
    if (!capturedPhoto) return;
    sounds.playTransferStart();

    // Calculate approximate size
    const head = 'data:image/jpeg;base64,';
    const base64Len = capturedPhoto.startsWith(head) ? capturedPhoto.length - head.length : capturedPhoto.length;
    const size = Math.round((base64Len * 3) / 4);

    onCaptureAndSend({
      dataUrl: capturedPhoto,
      imageMode,
      name: `camera_${Date.now()}.jpg`,
      size
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop camera-modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card camera-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flash Overlay */}
        {flashAnimation && <div className="camera-flash-overlay" />}

        {/* Modal Header */}
        <div className="camera-modal-header">
          <div className="camera-title-group">
            <div className="camera-title-badge">
              <Camera size={15} className="text-pink" />
              <span>Camera Capture</span>
            </div>
            <span className="camera-subtitle">Instant Encrypted Photo</span>
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

        {/* Image Mode Selection Pills */}
        <div className="camera-mode-selector">
          <span className="camera-mode-label">Send as:</span>
          <div className="camera-mode-pills">
            <button
              type="button"
              className={`mode-pill pill-once ${imageMode === 'once' ? 'mode-pill-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setImageMode('once');
              }}
              title="Burns forever after 1 viewing"
            >
              <Flame size={13} />
              <span>⚡ View Once</span>
            </button>

            <button
              type="button"
              className={`mode-pill pill-repeat ${imageMode === 'repeat' ? 'mode-pill-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setImageMode('repeat');
              }}
              title="Replayable during this session"
            >
              <Repeat size={13} />
              <span>🔁 Repeat</span>
            </button>

            <button
              type="button"
              className={`mode-pill pill-permanent ${imageMode === 'permanent' ? 'mode-pill-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setImageMode('permanent');
              }}
              title="Standard viewable photo"
            >
              <InfinityIcon size={13} />
              <span>♾️ Permanent</span>
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="camera-viewfinder-container">
          {capturedPhoto ? (
            <div className="camera-preview-wrap">
              <img 
                src={capturedPhoto} 
                alt="Captured Snapshot" 
                className="camera-preview-img" 
              />
              <div className="camera-preview-badge">
                <Check size={14} className="text-cyan" />
                <span>Photo Ready</span>
              </div>
            </div>
          ) : (
            <div className="camera-live-wrap">
              {cameraError ? (
                <div className="camera-error-fallback">
                  <Camera size={36} className="text-pink animate-pulse" />
                  <p className="camera-error-msg">{cameraError}</p>
                  <button
                    type="button"
                    className="btn-open-native-camera"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    <span>Open Phone / Device Camera App</span>
                  </button>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`camera-video-feed ${facingMode === 'user' ? 'mirror-feed' : ''}`} 
                  />
                  {/* Viewfinder Target Reticle */}
                  <div className="camera-crosshairs">
                    <div className="crosshair-corner top-left" />
                    <div className="crosshair-corner top-right" />
                    <div className="crosshair-corner bottom-left" />
                    <div className="crosshair-corner bottom-right" />
                    <div className="crosshair-center-dot" />
                  </div>

                  {isStartingCamera && (
                    <div className="camera-loading-overlay">
                      <RefreshCw size={24} className="animate-spin text-cyan" />
                      <span>Initializing Camera...</span>
                    </div>
                  )}

                  {/* Flip Camera Button */}
                  <button
                    type="button"
                    className="btn-flip-camera"
                    onClick={handleToggleFacingMode}
                    title="Switch Front / Rear Camera"
                  >
                    <FlipHorizontal size={18} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Hidden Native Camera Input with capture="environment" for native phone camera app */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment" 
            style={{ display: 'none' }} 
            onChange={handleNativeCameraCapture} 
          />
        </div>

        {/* Footer Controls */}
        <div className="camera-modal-footer">
          {capturedPhoto ? (
            <div className="camera-action-group">
              <button
                type="button"
                className="btn-secondary btn-retake"
                onClick={handleRetake}
              >
                <RotateCcw size={15} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                className="btn-primary btn-send-photo"
                onClick={handleConfirmSend}
              >
                <Send size={15} />
                <span>
                  {imageMode === 'once' ? 'Send View Once ⚡' : 'Send Photo 📷'}
                </span>
              </button>
            </div>
          ) : (
            <div className="camera-capture-controls">
              <button
                type="button"
                className="btn-native-camera-fallback"
                onClick={() => fileInputRef.current?.click()}
                title="Launch full native camera app with device flash & zoom"
              >
                <Camera size={14} />
                <span>Native Camera</span>
              </button>

              <button
                type="button"
                className="btn-shutter-snap"
                onClick={handleSnap}
                disabled={isStartingCamera || !!cameraError}
                title="Snap Photo"
              >
                <div className="shutter-inner-circle" />
              </button>

              <button
                type="button"
                className="btn-modal-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
