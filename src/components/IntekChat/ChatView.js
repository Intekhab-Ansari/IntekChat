'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Camera,
  Trash2, 
  Eye, 
  Repeat, 
  Infinity as InfinityIcon, 
  Lock, 
  ShieldCheck, 
  Download, 
  FileText, 
  Flame, 
  File, 
  FileArchive, 
  FileCode, 
  FileVideo, 
  FileAudio,
  EyeOff,
  CheckCheck,
  Check,
  Type,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Users,
  PanelLeft,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  MoreHorizontal,
  Copy,
  X,
  Reply,
  Info,
  Key,
  DatabaseZap,
  Paintbrush,
  Edit3,
  QrCode,
  LogOut,
  Palette
} from 'lucide-react';
import { formatBytes, getAvatarColor } from '@/lib/peer';
import { sounds } from '@/lib/sound';
import { getWallpaperCss } from '@/lib/wallpapers';
import WallpaperModal from '@/components/Modals/WallpaperModal';
import CameraModal from '@/components/Modals/CameraModal';

// Interactive Swipe-to-Reply Message Item with Long-Press Context Menu & Haptic Feedback
function SwipeableMessageRow({
  msg,
  isSelf,
  avatar,
  isStealthTextMode,
  onStartReply,
  scrollToMessage,
  handleOpenViewOnce,
  setViewOnceModalData,
  getFileIcon,
  onOpenMessageOptions
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      isHorizontal: null
    };
    isLongPressActiveRef.current = false;
    clearLongPress();

    // 420ms long press detection just like WhatsApp / Telegram
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setIsDragging(false);
      setSwipeOffset(0);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([28, 22]); } catch {}
      }
      sounds.playClick();
      onOpenMessageOptions?.(msg, { x: touch.clientX, y: touch.clientY });
    }, 420);

    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.hypot(deltaX, deltaY) > 8) {
      clearLongPress();
    }

    if (isLongPressActiveRef.current) return;

    if (touchStartRef.current.isHorizontal === null) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStartRef.current.isHorizontal = false;
        return;
      } else if (Math.abs(deltaX) > 8) {
        touchStartRef.current.isHorizontal = true;
      } else {
        return;
      }
    }

    if (touchStartRef.current.isHorizontal === false) return;

    if (e.cancelable) e.preventDefault();

    if (deltaX > 0) {
      const damped = Math.min(80, Math.pow(deltaX, 0.88) * 1.5);
      setSwipeOffset(damped);
      if (damped >= 50 && swipeOffset < 50) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(12); } catch {}
        }
      }
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = (e) => {
    clearLongPress();
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      setIsDragging(false);
      setSwipeOffset(0);
      touchStartRef.current = null;
      if (e?.cancelable) e.preventDefault();
      return;
    }

    setIsDragging(false);
    if (swipeOffset >= 48) {
      sounds.playClick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([15, 25]); } catch {}
      }
      onStartReply(msg);
    }
    setSwipeOffset(0);
    touchStartRef.current = null;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearLongPress();
    onOpenMessageOptions?.(msg, { x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button, a, input')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let isSwiping = false;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (!isSwiping) {
        if (Math.abs(deltaY) > 8) {
          cleanup();
          return;
        }
        if (deltaX > 8) {
          isSwiping = true;
          setIsDragging(true);
        }
      }

      if (isSwiping && deltaX > 0) {
        const damped = Math.min(80, Math.pow(deltaX, 0.88) * 1.5);
        setSwipeOffset(damped);
      }
    };

    const onMouseUp = () => {
      cleanup();
      setIsDragging(false);
      setSwipeOffset((cur) => {
        if (cur >= 48) {
          sounds.playClick();
          onStartReply(msg);
        }
        return 0;
      });
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      id={`msg-${msg.id}`}
      className={`message-row ${isSelf ? 'message-self' : 'message-peer'}`}
    >
      {/* Swipe-to-reply Track Indicator */}
      <div 
        className="swipe-reply-track"
        style={{
          opacity: swipeOffset > 6 ? Math.min(1, (swipeOffset - 6) / 36) : 0,
          transform: `translateX(${Math.min(swipeOffset * 0.45, 28)}px) scale(${swipeOffset >= 48 ? 1.15 : 0.85 + (swipeOffset / 48) * 0.15})`
        }}
      >
        <div className={`swipe-reply-icon-bubble ${swipeOffset >= 48 ? 'swipe-reply-active' : ''}`}>
          <Reply size={15} />
        </div>
      </div>

      {!isSelf && (
        <div 
          className="msg-avatar" 
          style={{ 
            borderColor: avatar.border, 
            color: avatar.text, 
            background: avatar.bg 
          }}
        >
          {msg.senderName?.charAt(0) || 'P'}
        </div>
      )}

      <div 
        className="msg-bubble-wrap"
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="msg-sender-info">
          <span className="msg-sender-name">{isSelf ? 'You' : msg.senderName}</span>
          <span className="msg-time">{msg.time}</span>
          {isSelf && (
            <span 
              className="msg-seen-status" 
              title={msg.seen 
                ? `Seen by ${msg.seenBy && msg.seenBy.length > 0 ? msg.seenBy.join(', ') : 'others'}` 
                : 'Sent (Encrypted)'}
            >
              {msg.seen ? (
                <CheckCheck size={14} className="seen-check-icon seen-active" />
              ) : (
                <Check size={13} className="seen-check-icon sent-active" />
              )}
            </span>
          )}
          <button
            type="button"
            className="msg-reply-btn"
            onClick={() => onStartReply(msg)}
            title="Reply to this message"
          >
            <Reply size={12} />
            <span>Reply</span>
          </button>
          <button
            type="button"
            className="msg-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMessageOptions?.(msg, { x: e.clientX, y: e.clientY });
            }}
            title="Message options (Copy, Reply, Info, Delete)"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        <div 
          className="msg-bubble"
          onMouseDown={handleMouseDown}
          onDoubleClick={() => onStartReply(msg)}
          onContextMenu={handleContextMenu}
          title="Hold or right-click for options (Copy, Reply, etc.)"
        >
          {/* QUOTED REPLY BLOCK */}
          {msg.replyTo && (
            <div 
              className="msg-quote-card"
              onClick={(e) => {
                e.stopPropagation();
                scrollToMessage(msg.replyTo.id);
              }}
              title="Click to jump to quoted message"
            >
              <div className="quote-accent-line" />
              <div className="quote-body">
                <div className="quote-header">
                  <Reply size={11} className="quote-icon" />
                  <span className="quote-author">{msg.replyTo.senderName}</span>
                </div>
                <p className="quote-text">{msg.replyTo.text}</p>
              </div>
            </div>
          )}
          {/* TEXT MESSAGE */}
          {msg.type === 'text' && (
            <p className="msg-text">{msg.text}</p>
          )}

          {/* IMAGE MESSAGE */}
          {msg.type === 'image' && (
            <div className="msg-media-block">
              {isStealthTextMode ? (
                <div className="stealth-tag">
                  <ImageIcon size={14} />
                  <span>[Photo: {msg.imageMode?.toUpperCase() || 'NORMAL'}]</span>
                  {!msg.isBurned && (
                    <button 
                      type="button" 
                      className="stealth-reveal-btn"
                      onClick={() => {
                        if (msg.imageMode === 'once') handleOpenViewOnce(msg);
                        else setViewOnceModalData(msg);
                      }}
                    >
                      View
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {msg.isBurned ? (
                    <div className="burned-badge">
                      <Flame size={16} className="text-pink animate-pulse" />
                      <span>Photo Burned (Self-Destructed)</span>
                    </div>
                  ) : msg.imageMode === 'once' ? (
                    <div 
                      className="view-once-card"
                      onClick={() => handleOpenViewOnce(msg)}
                    >
                      <div className="view-once-blur-bg" style={{ backgroundImage: `url(${msg.dataUrl})` }} />
                      <div className="view-once-overlay">
                        <EyeOff size={22} className="text-pink animate-pulse" />
                        <span className="view-once-title">⚡ View Once Photo</span>
                        <span className="view-once-hint">Tap to view (Burns forever)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="image-preview-card">
                      <img src={msg.dataUrl} alt={msg.name || 'Shared Image'} className="chat-img" />
                      <div className="image-mode-tag">
                        {msg.imageMode === 'repeat' ? (
                          <>
                            <Repeat size={12} />
                            <span>Repeatable</span>
                          </>
                        ) : (
                          <>
                            <InfinityIcon size={12} />
                            <span>Permanent</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* GENERIC FILE MESSAGE */}
          {msg.type === 'file' && (
            <div className="msg-file-block">
              {isStealthTextMode ? (
                <div className="stealth-tag">
                  {getFileIcon(msg.name)}
                  <span>[{msg.name} • {formatBytes(msg.size)}]</span>
                  <a 
                    href={msg.dataUrl} 
                    download={msg.name} 
                    className="stealth-download-link"
                  >
                    Save
                  </a>
                </div>
              ) : (
                <div className="chat-file-card">
                  <div className="file-icon-wrap">
                    {getFileIcon(msg.name)}
                  </div>
                  <div className="file-details">
                    <span className="file-name" title={msg.name}>{msg.name}</span>
                    <span className="file-size">{formatBytes(msg.size)}</span>
                  </div>
                  <a 
                    href={msg.dataUrl} 
                    download={msg.name} 
                    className="file-download-btn"
                    title="Download File"
                  >
                    <Download size={16} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatView({
  messages,
  onSendMessage,
  onSendFileInChat,
  onClearChat,
  onBurnViewOnce,
  roomName,
  peers = [],
  peerCount = 0,
  totalParticipants = 1,
  roomPassword = '',
  userProfile,
  onJoinRoom,
  isRoomProtected = false,
  onOpenRoomModal,
  onOpenEditRoom,
  onOpenProfile,
  onOpenQr,
  onLeaveRoom,
  typingUsers = [],
  onTypingChange,
  syncedWallpaper,
  onBroadcastWallpaper,
  onMarkMessagesSeen,
  onDeleteMessage,
  wallpaperType: propWallpaperType,
  customWallpaper: propCustomWallpaper,
  wallpaperOpacity: propWallpaperOpacity,
  wallpaperBlur: propWallpaperBlur,
  onOpenAppearance,
  onSelectWallpaper: propOnSelectWallpaper,
  onUploadCustomWallpaper: propOnUploadCustomWallpaper,
  onClearCustomWallpaper: propOnClearCustomWallpaper,
  onChangeWallpaperOpacity: propOnChangeWallpaperOpacity,
  onToggleWallpaperBlur: propOnToggleWallpaperBlur
}) {
  const avatarStyle = getAvatarColor(userProfile?.colorIndex || 0);
  const [inputText, setInputText] = useState('');
  const [imageMode, setImageMode] = useState('permanent');
  const [showImageModePicker, setShowImageModePicker] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isStealthTextMode, setIsStealthTextMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [selectedMessageForOptions, setSelectedMessageForOptions] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const copyToastTimerRef = useRef(null);

  const handleOpenMessageOptions = useCallback((msg, coords) => {
    setSelectedMessageForOptions({ msg, coords });
  }, []);

  const handleCopyMessage = useCallback((msg) => {
    if (!msg) return;
    let textToCopy = '';
    if (msg.type === 'text') {
      textToCopy = msg.text || '';
    } else if (msg.type === 'file') {
      textToCopy = msg.name ? `[File: ${msg.name}]` : (msg.dataUrl || '');
    } else if (msg.type === 'image') {
      textToCopy = msg.name ? `[Photo: ${msg.name}]` : (msg.dataUrl || '');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopyToast('Copied to clipboard');
        if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
        copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 2200);
      }).catch(() => {
        setCopyToast('Copied');
        setTimeout(() => setCopyToast(null), 2000);
      });
    }
    sounds.playClick();
    setSelectedMessageForOptions(null);
  }, []);

  const handleSaveMedia = useCallback((msg) => {
    if (!msg || !msg.dataUrl) return;
    try {
      const a = document.createElement('a');
      a.href = msg.dataUrl;
      a.download = msg.name || (msg.type === 'image' ? 'photo.png' : 'file');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setCopyToast('Saved to device');
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 2200);
    } catch (e) {
      console.warn('Save failed:', e);
    }
    setSelectedMessageForOptions(null);
  }, []);

  const handleDeleteFromSession = useCallback((msgId) => {
    if (onDeleteMessage) {
      onDeleteMessage(msgId);
      setCopyToast('Message deleted');
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 2000);
    }
    setSelectedMessageForOptions(null);
  }, [onDeleteMessage]);

  // Close message options modal on Escape key
  useEffect(() => {
    if (!selectedMessageForOptions) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedMessageForOptions(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMessageForOptions]);

  const [showSidebarPassword, setShowSidebarPassword] = useState(false);
  const [viewOnceModalData, setViewOnceModalData] = useState(null);
  const [viewOnceTimer, setViewOnceTimer] = useState(10);

  // Hero Room Creation & Join States
  const [heroTab, setHeroTab] = useState('create'); // 'create' | 'join'
  const [heroRoomName, setHeroRoomName] = useState('');
  const [heroProtectPassword, setHeroProtectPassword] = useState(false);
  const [heroPassword, setHeroPassword] = useState('');
  const [heroShowPassword, setHeroShowPassword] = useState(false);

  // Chat Wallpaper States
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [wallpaperType, setWallpaperType] = useState('doodles');
  const [customWallpaper, setCustomWallpaper] = useState(null);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(18);
  const [wallpaperBlur, setWallpaperBlur] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const activeWallpaperType = propWallpaperType !== undefined ? propWallpaperType : wallpaperType;
  const activeCustomWallpaper = propCustomWallpaper !== undefined ? propCustomWallpaper : customWallpaper;
  const activeWallpaperOpacity = propWallpaperOpacity !== undefined ? propWallpaperOpacity : wallpaperOpacity;
  const activeWallpaperBlur = propWallpaperBlur !== undefined ? propWallpaperBlur : wallpaperBlur;

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const textInputRef = useRef(null);
  const imagePickerRef = useRef(null);
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isCurrentlyTypingRef = useRef(false);

  const generateHeroRandomRoom = () => {
    sounds.playClick();
    const adjectives = ['cyber', 'stealth', 'quantum', 'shadow', 'nexus', 'sonic', 'phantom', 'cosmic'];
    const nouns = ['vault', 'matrix', 'sanctum', 'bunker', 'haven', 'node'];
    const num = Math.floor(100 + Math.random() * 900);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    setHeroRoomName(`${adj}-${noun}-${num}`);
  };

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    const raw = heroRoomName.trim();
    if (!raw) return;
    sounds.playSuccess();
    let clean = raw.toLowerCase();
    if (clean.includes('room=')) {
      try {
        const u = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
        const r = u.searchParams.get('room');
        if (r) clean = r;
      } catch {}
    }
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?intekchat\.(?:com|vercel\.app)\//i, '');
    clean = clean.replace(/^[#/]+/, '');
    clean = clean.replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!clean) clean = `room-${Math.random().toString(36).substring(2, 8)}`;
    onJoinRoom(clean, heroProtectPassword ? heroPassword.trim() : null);
  };

  // Load saved wallpaper preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem('intekchat_wallpaper_type');
      if (savedType !== null) setWallpaperType(savedType);
      else setWallpaperType('doodles');

      const savedCustom = localStorage.getItem('intekchat_wallpaper_custom');
      if (savedCustom) setCustomWallpaper(savedCustom);

      const savedOpacity = localStorage.getItem('intekchat_wallpaper_opacity');
      if (savedOpacity) setWallpaperOpacity(Number(savedOpacity));

      const savedBlur = localStorage.getItem('intekchat_wallpaper_blur');
      if (savedBlur !== null) setWallpaperBlur(savedBlur === 'true');
    }
  }, []);

  const handleSelectWallpaper = (type) => {
    setWallpaperType(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_type', type);
    }
  };

  const handleUploadCustomWallpaper = (dataUrl) => {
    setCustomWallpaper(dataUrl);
    setWallpaperType('custom');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('intekchat_wallpaper_custom', dataUrl);
        localStorage.setItem('intekchat_wallpaper_type', 'custom');
      } catch (e) {
        console.warn('LocalStorage save custom wallpaper error:', e);
      }
    }
  };

  const handleClearCustomWallpaper = () => {
    setCustomWallpaper(null);
    setWallpaperType('none');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('intekchat_wallpaper_custom');
      localStorage.setItem('intekchat_wallpaper_type', 'none');
    }
  };

  const handleChangeOpacity = (val) => {
    setWallpaperOpacity(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_opacity', String(val));
    }
  };

  const handleToggleBlur = (val) => {
    setWallpaperBlur(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('intekchat_wallpaper_blur', String(val));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStealthTextMode]);

  const burnRef = useRef(null);

  const handleCloseAndBurnViewOnce = useCallback(() => {
    if (viewOnceModalData) {
      sounds.playBurn();
      onBurnViewOnce(viewOnceModalData.id, viewOnceModalData.senderId);
      setViewOnceModalData(null);
    }
  }, [viewOnceModalData, onBurnViewOnce]);

  useEffect(() => {
    burnRef.current = handleCloseAndBurnViewOnce;
  }, [handleCloseAndBurnViewOnce]);

  useEffect(() => {
    if (viewOnceModalData) {
      timerRef.current = setInterval(() => {
        setViewOnceTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            burnRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewOnceModalData]);

  // Cancel reply on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && replyingTo) {
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyingTo]);

  // Close image options menu when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!showImageModePicker) return;

    const handleClickOutside = (e) => {
      if (imagePickerRef.current && !imagePickerRef.current.contains(e.target)) {
        setShowImageModePicker(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowImageModePicker(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showImageModePicker]);

  const handleStartReply = (msg) => {
    sounds.playClick();
    setReplyingTo(msg);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 50);
  };

  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('msg-highlight-pulse');
      setTimeout(() => {
        el.classList.remove('msg-highlight-pulse');
      }, 1400);
    }
  };

  // Sync room wallpaper when received from another peer in the room
  useEffect(() => {
    if (syncedWallpaper && syncedWallpaper.wallpaperType) {
      setWallpaperType(syncedWallpaper.wallpaperType);
      if (syncedWallpaper.customImage !== undefined) {
        setCustomWallpaper(syncedWallpaper.customImage);
      }
      if (typeof syncedWallpaper.opacity === 'number') {
        setWallpaperOpacity(syncedWallpaper.opacity);
      }
      if (typeof syncedWallpaper.blur === 'boolean') {
        setWallpaperBlur(syncedWallpaper.blur);
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('intekchat_wallpaper_type', syncedWallpaper.wallpaperType);
          if (syncedWallpaper.customImage) {
            localStorage.setItem('intekchat_wallpaper_custom', syncedWallpaper.customImage);
          }
        } catch (e) {}
      }
    }
  }, [syncedWallpaper]);

  // Real-time Seen Receipts: Detect incoming messages viewed by the current user
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkAndMarkSeen = () => {
      if (document.visibilityState !== 'visible') return;
      const unseen = (messages || [])
        .filter((m) => !m.system && m.senderId !== userProfile?.id && !m.seen)
        .map((m) => m.id);
      if (unseen.length > 0) {
        onMarkMessagesSeen?.(unseen);
      }
    };

    checkAndMarkSeen();
    document.addEventListener('visibilitychange', checkAndMarkSeen);
    window.addEventListener('focus', checkAndMarkSeen);
    return () => {
      document.removeEventListener('visibilitychange', checkAndMarkSeen);
      window.removeEventListener('focus', checkAndMarkSeen);
    };
  }, [messages, userProfile?.id, onMarkMessagesSeen]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onTypingChange?.(true);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onTypingChange?.(false);
    }, 2200);
  };

  const handleSendText = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isCurrentlyTypingRef.current = false;
    onTypingChange?.(false);

    sounds.playMessage();
    const cleanText = inputText.trim().slice(0, 10000);
    const payload = {
      type: 'text',
      text: cleanText
    };

    if (replyingTo) {
      payload.replyTo = {
        id: replyingTo.id,
        senderName: replyingTo.senderId === userProfile?.id ? 'You' : replyingTo.senderName,
        senderColor: replyingTo.senderColor || 0,
        text: replyingTo.type === 'text' 
          ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text)
          : replyingTo.type === 'image' ? '📷 Photo' : `📎 ${replyingTo.name || 'File'}`,
        type: replyingTo.type
      };
      setReplyingTo(null);
    }

    onSendMessage(payload);
    setInputText('');

    // Crucial: keep virtual keyboard open continuously on mobile & desktop!
    if (textInputRef.current) {
      textInputRef.current.focus({ preventScroll: true });
    }
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus({ preventScroll: true });
      }
    }, 10);
  };

  const handleCameraCaptureAndSend = ({ dataUrl, imageMode: captureMode, name, size }) => {
    sounds.playTransferStart();
    const payload = {
      type: 'image',
      dataUrl,
      imageMode: captureMode,
      name: name || `camera_${Date.now()}.jpg`,
      size: size || 60000
    };

    if (replyingTo) {
      payload.replyTo = {
        id: replyingTo.id,
        senderName: replyingTo.senderId === userProfile?.id ? 'You' : replyingTo.senderName,
        senderColor: replyingTo.senderColor || 0,
        text: replyingTo.type === 'text' 
          ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text)
          : replyingTo.type === 'image' ? '📷 Photo' : `📎 ${replyingTo.name || 'File'}`,
        type: replyingTo.type
      };
      setReplyingTo(null);
    }

    onSendMessage(payload);
  };

  const handleTriggerImageUpload = (mode) => {
    setImageMode(mode);
    setShowImageModePicker(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
      imageInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Photo exceeds 25MB. For large media and files, switch to the IntekDrop tab for lightning-fast direct P2P streaming!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      sounds.playTransferStart();
      const payload = {
        type: 'image',
        dataUrl: base64Data,
        imageMode,
        name: file.name,
        size: file.size
      };

      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          senderName: replyingTo.senderId === userProfile?.id ? 'You' : replyingTo.senderName,
          senderColor: replyingTo.senderColor || 0,
          text: replyingTo.type === 'text' 
            ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text)
            : replyingTo.type === 'image' ? '📷 Photo' : `📎 ${replyingTo.name || 'File'}`,
          type: replyingTo.type
        };
        setReplyingTo(null);
      }

      onSendMessage(payload);
    };
    reader.readAsDataURL(file);
  };

  const handleGenericFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File exceeds 25MB. For large files (ZIP, video, ISO, etc.), use the IntekDrop tab for unlimited high-speed P2P transfer!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sounds.playTransferStart();
      const payload = {
        type: 'file',
        name: file.name,
        size: file.size,
        mimeType: file.type,
        dataUrl: reader.result
      };

      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          senderName: replyingTo.senderId === userProfile?.id ? 'You' : replyingTo.senderName,
          senderColor: replyingTo.senderColor || 0,
          text: replyingTo.type === 'text' 
            ? (replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text)
            : replyingTo.type === 'image' ? '📷 Photo' : `📎 ${replyingTo.name || 'File'}`,
          type: replyingTo.type
        };
        setReplyingTo(null);
      }

      onSendMessage(payload);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenViewOnce = (msg) => {
    sounds.playClick();
    setViewOnceTimer(10);
    setViewOnceModalData(msg);
  };

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive size={20} className="text-amber" />;
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return <FileVideo size={20} className="text-pink" />;
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return <FileAudio size={20} className="text-emerald" />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) return <FileCode size={20} className="text-cyan" />;
    return <FileText size={20} className="text-cyan" />;
  };

  // If no room is active, render interactive Room Creation & Joining Hero
  if (!roomName) {
    return (
      <div className="chat-join-hero">
        <div className="hero-glow-bubble" />
        <div className="hero-card">
          <div className="hero-badge">
            <ShieldCheck size={16} className="text-cyan" />
            <span>Zero-Knowledge • End-to-End Encrypted</span>
          </div>

          <h1 className="hero-title">
            Private Disposable Rooms.<br />
            <span className="text-gradient">No login. No server trace.</span>
          </h1>

          <p className="hero-subtitle">
            Create a custom room with optional password protection. All chats, images, and files stay strictly inside your browsers with end-to-end encryption.
          </p>

          {/* Hero Tabs: Create vs Join */}
          <div className="hero-tabs">
            <button
              type="button"
              className={`hero-tab ${heroTab === 'create' ? 'hero-tab-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setHeroTab('create');
              }}
            >
              <Sparkles size={14} />
              <span>Create Room</span>
            </button>

            <button
              type="button"
              className={`hero-tab ${heroTab === 'join' ? 'hero-tab-active' : ''}`}
              onClick={() => {
                sounds.playClick();
                setHeroTab('join');
              }}
            >
              <ArrowRight size={14} />
              <span>Join Room</span>
            </button>
          </div>

          <form className="hero-form" onSubmit={handleHeroSubmit}>
            {/* Room Name Input with Prefix and Random Generator */}
            <div className="room-input-wrap">
              <span className="room-prefix desktop-prefix">intekchat.com/</span>
              <span className="room-prefix mobile-prefix">#</span>
              <input
                type="text"
                className="room-input"
                placeholder={heroTab === 'create' ? 'my-secret-vault' : 'enter-room-name'}
                value={heroRoomName}
                onChange={(e) => setHeroRoomName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                required
              />
              {heroTab === 'create' && (
                <button
                  type="button"
                  className="btn-hero-random"
                  onClick={generateHeroRandomRoom}
                  title="Generate Unique Memorable Name"
                >
                  <Sparkles size={12} />
                  <span>Random</span>
                </button>
              )}
            </div>

            {/* Quick Presets for Hero */}
            {heroTab === 'create' && (
              <div className="room-preset-chips hero-preset-chips">
                <span className="preset-label">Suggestions:</span>
                {['quantum-vault', 'stealth-drop', 'cyber-matrix', 'crypto-haven', 'phantom-hub'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      sounds.playClick();
                      const num = Math.floor(100 + Math.random() * 900);
                      setHeroRoomName(`${preset}-${num}`);
                    }}
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            )}

            {/* Password Protection for Create Mode */}
            {heroTab === 'create' && (
              <div className="hero-password-box">
                <label className="hero-checkbox-row">
                  <input
                    type="checkbox"
                    checked={heroProtectPassword}
                    onChange={(e) => setHeroProtectPassword(e.target.checked)}
                    className="hero-checkbox"
                  />
                  <div className="hero-checkbox-text">
                    <span className="hero-checkbox-title">
                      <Lock size={13} className="text-accent" />
                      <span>Protect Room with Password</span>
                    </span>
                    <span className="hero-checkbox-desc">Others will need this password to join & read messages</span>
                  </div>
                </label>

                {heroProtectPassword && (
                  <div className="hero-password-input-wrap">
                    <Key size={16} className="text-dim" />
                    <input
                      type={heroShowPassword ? 'text' : 'password'}
                      className="hero-password-input"
                      placeholder="Set room password..."
                      value={heroPassword}
                      onChange={(e) => setHeroPassword(e.target.value)}
                      required={heroProtectPassword}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setHeroShowPassword(!heroShowPassword)}
                      tabIndex={-1}
                    >
                      {heroShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optional Password Input for Join Mode */}
            {heroTab === 'join' && (
              <div className="hero-password-input-wrap join-password-wrap">
                <Key size={16} className="text-dim" />
                <input
                  type={heroShowPassword ? 'text' : 'password'}
                  className="hero-password-input"
                  placeholder="Room password (if protected)..."
                  value={heroPassword}
                  onChange={(e) => setHeroPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setHeroShowPassword(!heroShowPassword)}
                  tabIndex={-1}
                >
                  {heroShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary hero-btn"
              disabled={!heroRoomName.trim() || (heroTab === 'create' && heroProtectPassword && !heroPassword.trim())}
            >
              <span>{heroTab === 'create' ? 'Create Encrypted Room' : 'Join Room'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="hero-quick-action">
            <span>Need an instant throwaway room?</span>
            <button 
              type="button"
              className="btn-quick-create"
              onClick={() => {
                const randomRoom = `room-${Math.random().toString(36).substring(2, 8)}`;
                onJoinRoom(randomRoom, null);
              }}
            >
              <Sparkles size={14} />
              <span>Create Instant Room</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout-wrapper">
      {/* Mobile Backdrop for Sidebar */}
      {isSidebarOpen && (
        <div 
          className="sidebar-mobile-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleImageFileChange} 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleGenericFileChange} 
      />

      {/* Left Room Sidebar (Structured Info) */}
      <aside className={`chat-room-sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-header">
          <div 
            className="sidebar-room-pill clickable-room-pill" 
            onClick={onOpenRoomModal}
            title={`Room: #${roomName}. Click to manage.`}
          >
            {isRoomProtected ? <Lock size={14} className="text-pink flex-shrink-0" /> : <Lock size={14} className="text-accent flex-shrink-0" />}
            <span className="sidebar-room-name" title={`#${roomName}`}>#{roomName}</span>
            {isRoomProtected && <span className="room-mini-lock flex-shrink-0">🔒</span>}
          </div>
          <div className="sidebar-header-actions">
            <button 
              type="button"
              className="sidebar-edit-btn"
              onClick={onOpenEditRoom || onOpenRoomModal}
              title="Edit Room ID and Password Details"
              aria-label="Edit Room"
            >
              <Edit3 size={13} />
            </button>
            <button 
              type="button"
              className="sidebar-close-btn"
              onClick={() => setIsSidebarOpen(false)}
              title="Close Room Sidebar"
              aria-label="Close Room Sidebar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Security Specs Card */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <ShieldCheck size={14} className="text-cyan" />
            <span>Session Security</span>
          </div>
          <div className="security-specs-card">
            <div className="spec-row">
              <span className="spec-label">Room ID:</span>
              <span className="spec-value font-mono">#{roomName}</span>
            </div>
            {isRoomProtected && (
              <div className="spec-row">
                <span className="spec-label">Password:</span>
                <span className="spec-value text-accent font-mono spec-password-cell">
                  {showSidebarPassword ? roomPassword : '••••••••'}
                  <button 
                    type="button" 
                    className="btn-mini-eye"
                    onClick={() => setShowSidebarPassword(!showSidebarPassword)}
                    title={showSidebarPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSidebarPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </span>
              </div>
            )}
            <div className="spec-row">
              <span className="spec-label">Access Mode:</span>
              <span className="spec-value">{isRoomProtected ? '🔒 Password Protected' : '🔓 Open Room'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Online In Room:</span>
              <span className="spec-value text-emerald font-bold">
                {totalParticipants <= 1 ? '1 Person (You)' : `${totalParticipants} Connected`}
              </span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Encryption:</span>
              <span className="spec-value">End-to-End Encrypted</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Security:</span>
              <span className="spec-value">{isRoomProtected ? 'Password Protected' : 'Private & Secure'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-label">Storage:</span>
              <span className="spec-value text-accent">0 B (No Server Storage)</span>
            </div>
          </div>
        </div>

        {/* Connected Peers List */}
        <div className="sidebar-section sidebar-peers-section">
          <div className="sidebar-section-title">
            <Users size={14} className="text-purple" />
            <span>People in Room ({peers.length + 1})</span>
          </div>

          <div className="sidebar-peers-scroll">
            {/* Self Peer */}
            <div className="sidebar-peer-item self-peer-item">
              <div className="peer-mini-avatar self-mini-avatar">
                {userProfile?.name?.charAt(0) || 'Y'}
              </div>
              <div className="peer-mini-info">
                <span className="peer-mini-name">{userProfile?.name} (You)</span>
                <span className="peer-mini-meta">{userProfile?.os?.toUpperCase()} • Host</span>
              </div>
              <span className="mini-status-dot online" />
            </div>

            {/* Remote Peers */}
            {peers.map((peer, idx) => {
              const avatar = getAvatarColor(idx + 1);
              return (
                <div key={peer.id} className="sidebar-peer-item">
                  <div 
                    className="peer-mini-avatar"
                    style={{ borderColor: avatar.border, color: avatar.text, background: avatar.bg }}
                  >
                    {peer.name?.charAt(0) || 'P'}
                  </div>
                  <div className="peer-mini-info">
                    <span className="peer-mini-name">{peer.name}</span>
                    <span className="peer-mini-meta">{peer.os?.toUpperCase()} • Active</span>
                  </div>
                  <span className="mini-status-dot online" />
                </div>
              );
            })}

            {peers.length === 0 && (
              <div className="no-peers-box">
                <p>Waiting for others to join #{roomName}...</p>
                <span>Share your room link to invite others</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="sidebar-action-btn wallpaper-btn"
            onClick={() => {
              sounds.playClick();
              if (onOpenAppearance) {
                onOpenAppearance('wallpaper');
              } else {
                setIsWallpaperModalOpen(true);
              }
            }}
            title="Theme & Chat Wallpaper"
          >
            <Palette size={14} />
            <span>Theme & Wallpaper</span>
          </button>

          <button 
            type="button" 
            className="sidebar-action-btn wipe-btn"
            onClick={() => {
              sounds.playClick();
              if (window.confirm('Clear all chat messages from this session?')) {
                onClearChat();
              }
            }}
            title="Clear all chat messages from this session"
          >
            <Trash2 size={14} />
            <span>Clear Chat History</span>
          </button>

          {roomName && (
            <button 
              type="button" 
              className="sidebar-action-btn leave-btn"
              onClick={() => {
                sounds.playClick();
                if (window.confirm(`Leave room #${roomName} and return to Local Wi-Fi?`)) {
                  onLeaveRoom?.();
                }
              }}
              title="Leave room and return to local network"
            >
              <LogOut size={14} />
              <span>Leave Room</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Conversation Column */}
      <section className="chat-main-pane">
        {/* Chat Sub-Header (Collapsible on toggle basis to maximize chat space) */}
        {isHeaderCollapsed ? (
          <div className="collapsed-header-bar">
            <button
              type="button"
              className="btn-expand-header"
              onClick={() => {
                sounds.playClick();
                setIsHeaderCollapsed(false);
              }}
              title="Show room options and toolbar"
            >
              <div className="collapsed-expand-inner">
                {isRoomProtected ? <Lock size={13} className="text-pink" /> : <Lock size={13} className="text-accent" />}
                <span className="collapsed-room-name">#{roomName}</span>
                <span className="collapsed-peer-pill">
                  <span className="realtime-live-dot" />
                  <span>{peerCount === 0 ? '1 in room' : `${peerCount + 1} online`}</span>
                </span>
                <ChevronDown size={14} className="collapsed-chevron" />
                <span className="collapsed-text">Show Options</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="chat-header">
            <div className="header-left">
              {!isSidebarOpen && (
                <button 
                  type="button"
                  className="btn-sidebar-open" 
                  onClick={() => setIsSidebarOpen(true)}
                  title="Show Room Details & Participants"
                >
                  <PanelLeft size={15} className="flex-shrink-0" />
                  <span className="btn-sidebar-label">Details</span>
                </button>
              )}

              <div 
                className="chat-room-badge clickable-room-badge"
                onClick={onOpenRoomModal}
                title="Click to manage room or switch rooms"
              >
                {isRoomProtected ? <Lock size={15} className="text-pink" /> : <Lock size={14} className="text-accent" />}
                <span className="room-title">#{roomName}</span>
                {isRoomProtected && <span className="room-protected-pill">Protected</span>}
              </div>

              <button 
                type="button" 
                className="btn-edit-room-quick"
                onClick={onOpenEditRoom || onOpenRoomModal}
                title="Edit Room ID and Password Protection"
              >
                <Edit3 size={13} />
                <span>Edit Room</span>
              </button>

              <span className="chat-peer-status" title="Real-time participants in this room">
                <span className="realtime-live-dot" />
                {peerCount === 0 
                  ? '1 in room (Waiting for others)' 
                  : `${totalParticipants || (peerCount + 1)} in room (${peerCount} other${peerCount === 1 ? '' : 's'} + You)`}
              </span>
            </div>

            <div className="header-right">
              {/* Collapse Toolbar Button to maximize chat viewport */}
              <button
                type="button"
                className="btn-collapse-header"
                onClick={() => {
                  sounds.playClick();
                  setIsHeaderCollapsed(true);
                }}
                title="Hide options bar to maximize space for chatting"
              >
                <ChevronUp size={15} />
                <span>Hide</span>
              </button>

              {/* Switch to Text / Stealth Privacy Toggle */}
              <button
                type="button"
                className={`btn-stealth ${isStealthTextMode ? 'stealth-active' : ''}`}
                onClick={() => setIsStealthTextMode(!isStealthTextMode)}
                title="Switch between Rich Media Mode and Discreet Text-Only Mode (Stealth Privacy)"
              >
                {isStealthTextMode ? (
                  <>
                    <LayoutGrid size={15} />
                    <span>Rich Media Mode</span>
                  </>
                ) : (
                  <>
                    <Type size={15} />
                    <span>Switch to Text</span>
                  </>
                )}
              </button>

              {/* Chat Wallpaper Button */}
              <button
                type="button"
                className="btn-wallpaper"
                onClick={() => {
                  sounds.playClick();
                  if (onOpenAppearance) {
                    onOpenAppearance('wallpaper');
                  } else {
                    setIsWallpaperModalOpen(true);
                  }
                }}
                title="Theme & Chat Wallpaper"
              >
                <Palette size={15} />
                <span>Appearance</span>
              </button>

              {/* Share Room QR Code Button */}
              <button
                type="button"
                className="btn-wallpaper"
                onClick={() => {
                  sounds.playClick();
                  onOpenQr?.();
                }}
                title="Share Room QR Code & Credentials"
              >
                <QrCode size={15} />
                <span>Room QR</span>
              </button>

              {/* Clear Chat Button */}
              <button 
                type="button"
                className="btn-clear-chat" 
                onClick={() => {
                  sounds.playClick();
                  if (window.confirm('Clear all chat messages from this session?')) {
                    onClearChat();
                  }
                }}
                title="Instant wipe of chat history (Zero Trace)"
              >
                <Trash2 size={15} />
                <span>Clear Chat</span>
              </button>

              {/* Quick Leave Room Button */}
              {roomName && (
                <button 
                  type="button"
                  className="btn-leave-chat" 
                  onClick={() => {
                    sounds.playClick();
                    if (window.confirm(`Leave room #${roomName} and return to Local Wi-Fi?`)) {
                      onLeaveRoom?.();
                    }
                  }}
                  title="Leave room and return to local network"
                >
                  <LogOut size={14} />
                  <span>Leave</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Identity & Presence Strip (Shown when options bar is open) */}
        {!isHeaderCollapsed && (
          <div className="mobile-identity-strip">
            <button 
              type="button" 
              className="mobile-id-tag user-tag"
              onClick={onOpenProfile}
              title="Click to view/change your Codename & Avatar"
            >
              <span 
                className="id-dot-avatar" 
                style={{ background: avatarStyle?.border || '#3b82f6' }} 
              />
              <span className="id-tag-label">You:</span>
              <span className="id-tag-name">{userProfile?.name || 'Anonymous'}</span>
              <span className="id-tag-os">({userProfile?.os?.toUpperCase() || 'HOST'})</span>
            </button>

            <button 
              type="button" 
              className="mobile-id-tag room-tag"
              onClick={onOpenRoomModal}
              title="Room Details & Participant Count"
            >
              <span className="realtime-live-dot" />
              <span className="id-room-name">#{roomName}</span>
              <span className="id-room-count">
                {peerCount === 0 ? '1 online' : `${peerCount + 1} online`}
              </span>
            </button>
          </div>
        )}

        {/* Dynamic Wallpaper Background Canvas Layer */}
        {activeWallpaperType !== 'none' && (
          <div 
            className="chat-wallpaper-canvas"
            style={{
              ...getWallpaperCss(activeWallpaperType, activeCustomWallpaper),
              opacity: activeWallpaperOpacity / 100,
              filter: activeWallpaperBlur ? 'blur(8px)' : 'none'
            }}
          />
        )}

        <div className="security-banner">
          <ShieldCheck size={14} className="text-cyan flex-shrink-0" />
          <span className="desktop-e2ee-text">End-to-End Encrypted • Direct Private Connection • Zero Server Logs</span>
          <span className="mobile-e2ee-text">End-to-End Encrypted • Private & Direct</span>
        </div>

        {/* Messages Feed Container */}
        <div className="chat-messages-scroll">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="empty-bubble">
                <div className="empty-icon-shield">
                  <Lock size={20} className="text-accent animate-pulse" />
                </div>
                <h3>Room #{roomName} is Ready</h3>
                <p>This room is private and encrypted. Messages leave zero trace on any server.</p>
                <div className="empty-quick-prompts">
                  <button 
                    type="button" 
                    className="prompt-chip prompt-chip-emerald"
                    onClick={() => {
                      sounds.playClick();
                      setIsCameraModalOpen(true);
                    }}
                    title="Take Camera Photo"
                    aria-label="Take Camera Photo"
                  >
                    <Camera size={15} className="flex-shrink-0" />
                    <span className="prompt-chip-label">Camera Photo</span>
                  </button>
                  <button 
                    type="button" 
                    className="prompt-chip prompt-chip-pink"
                    onClick={() => handleTriggerImageUpload('once')}
                    title="Send View-Once Photo (Self-destructing)"
                    aria-label="Send View-Once Photo"
                  >
                    <Flame size={15} className="flex-shrink-0" />
                    <span className="prompt-chip-label">View-Once Photo</span>
                  </button>
                  <button 
                    type="button" 
                    className="prompt-chip prompt-chip-cyan"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    title="Attach Any File (ZIP, PDF, APK, etc.)"
                    aria-label="Attach File"
                  >
                    <Paperclip size={15} className="flex-shrink-0" />
                    <span className="prompt-chip-label">Attach File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.system) {
              return (
                <div key={msg.id} className="message-system-row">
                  <div className="message-system-pill">
                    <Sparkles size={13} className="text-accent" />
                    <span>{msg.text}</span>
                    <span className="system-time">{msg.time}</span>
                  </div>
                </div>
              );
            }

            const isSelf = msg.senderId === userProfile?.id;
            const avatar = getAvatarColor(msg.senderColor || 0);

            return (
              <SwipeableMessageRow
                key={msg.id}
                msg={msg}
                isSelf={isSelf}
                avatar={avatar}
                isStealthTextMode={isStealthTextMode}
                onStartReply={handleStartReply}
                scrollToMessage={scrollToMessage}
                handleOpenViewOnce={handleOpenViewOnce}
                setViewOnceModalData={setViewOnceModalData}
                getFileIcon={getFileIcon}
                onOpenMessageOptions={handleOpenMessageOptions}
              />
            );
          })}
          {/* Real-time Typing Indicator with 3 Bouncing Dots */}
          {typingUsers && typingUsers.filter((u) => u.id !== userProfile?.id).length > 0 && (
            <div className="typing-indicator-row">
              <div className="typing-bubble">
                <span className="typing-sender-name">
                  {typingUsers.filter((u) => u.id !== userProfile?.id).map((u) => u.name).join(', ')}
                </span>
                <span className="typing-status-text">is typing</span>
                <div className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Dock */}
        <div className="chat-input-wrapper">
          {/* Active Reply Banner */}
          {replyingTo && (
            <div className="reply-preview-dock">
              <div className="reply-preview-content">
                <div className="reply-preview-bar-indicator" />
                <div className="reply-preview-details">
                  <span className="reply-preview-title">
                    <Reply size={12} className="text-accent" />
                    <span>Replying to <strong>{replyingTo.senderId === userProfile?.id ? 'yourself' : replyingTo.senderName}</strong></span>
                  </span>
                  <span className="reply-preview-snippet">
                    {replyingTo.type === 'text' 
                      ? replyingTo.text 
                      : replyingTo.type === 'image' 
                        ? '📷 Photo' 
                        : `📎 ${replyingTo.name || 'File'}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-reply"
                onClick={() => setReplyingTo(null)}
                title="Cancel reply (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <form className={`chat-input-bar ${replyingTo ? 'input-bar-has-reply' : ''}`} onSubmit={handleSendText}>
            {/* Camera Capture Button */}
            <button 
              type="button" 
              className="chat-action-btn btn-camera-action"
              onClick={() => {
                sounds.playClick();
                setIsCameraModalOpen(true);
              }}
              title="Take & Send Photo (Camera / Webcam)"
            >
              <Camera size={18} className="text-pink" />
            </button>

            {/* Image Mode & Upload Button */}
            <div className="attachment-dropdown-wrap" ref={imagePickerRef}>
              <button 
                type="button" 
                className="chat-action-btn"
                onClick={() => setShowImageModePicker(!showImageModePicker)}
                title="Attach Image (View Once, Repeat, Permanent)"
              >
                <ImageIcon size={18} className="text-pink" />
              </button>

              {showImageModePicker && (
                <>
                  <div 
                    className="image-picker-backdrop" 
                    onClick={() => setShowImageModePicker(false)}
                    onTouchStart={() => setShowImageModePicker(false)}
                  />
                  <div className="image-mode-picker">
                  <div className="picker-title">Send Image As:</div>

                  <button 
                    type="button" 
                    className="picker-option option-camera"
                    onClick={() => {
                      sounds.playClick();
                      setShowImageModePicker(false);
                      setIsCameraModalOpen(true);
                    }}
                  >
                    <div className="option-icon"><Camera size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">📸 Take Camera Photo</span>
                      <span className="option-desc">Webcam or Mobile Camera</span>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className="picker-option option-once"
                    onClick={() => handleTriggerImageUpload('once')}
                  >
                    <div className="option-icon"><Flame size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">⚡ View Once</span>
                      <span className="option-desc">Burns forever after 1 viewing</span>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className="picker-option option-repeat"
                    onClick={() => handleTriggerImageUpload('repeat')}
                  >
                    <div className="option-icon"><Repeat size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">🔁 Repeat</span>
                      <span className="option-desc">Replayable for this session</span>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    className="picker-option option-permanent"
                    onClick={() => handleTriggerImageUpload('permanent')}
                  >
                    <div className="option-icon"><InfinityIcon size={16} /></div>
                    <div className="option-text">
                      <span className="option-name">♾️ Permanent</span>
                      <span className="option-desc">Normal viewable chat photo</span>
                    </div>
                  </button>
                </div>
                </>
              )}
            </div>

            <button 
              type="button" 
              className="chat-action-btn"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              title="Attach Any File (ZIP, PDF, APK, Videos, Audio, etc.)"
            >
              <Paperclip size={18} className="text-cyan" />
            </button>

            <input 
              ref={textInputRef}
              type="text" 
              className="chat-text-input" 
              maxLength={10000}
              placeholder={replyingTo ? `Replying to ${replyingTo.senderId === userProfile?.id ? 'yourself' : replyingTo.senderName}...` : "Type an encrypted message..."}
              value={inputText}
              onChange={handleInputChange}
            />

            <button 
              type="submit" 
              className="chat-send-btn" 
              aria-disabled={!inputText.trim()}
              onMouseDown={(e) => {
                // Prevent mouse click from stealing focus from text input on desktop
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                // Prevent mobile browser from blurring the text input when tapping send
                if (!inputText.trim()) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                handleSendText(e);
              }}
              title="Send Encrypted Message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>

      {/* View-Once Full Screen Modal */}
      {viewOnceModalData && (
        <div className="view-once-modal-overlay" onClick={handleCloseAndBurnViewOnce}>
          <div className="view-once-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-burn-header">
              <div className="burn-warning">
                <Flame size={18} className="text-pink animate-pulse" />
                <span>Self-Destructing in: <strong>{viewOnceTimer}s</strong></span>
              </div>
              <button 
                type="button"
                className="btn-burn-now"
                onClick={handleCloseAndBurnViewOnce}
              >
                Close & Burn Now
              </button>
            </div>

            <div className="modal-image-wrap">
              <img 
                src={viewOnceModalData.dataUrl} 
                alt="View Once Secret" 
                className="modal-burn-img" 
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Selection Modal (Render fallback only if not managed globally by page.js) */}
      {!onOpenAppearance && (
        <WallpaperModal
          isOpen={isWallpaperModalOpen}
          onClose={() => setIsWallpaperModalOpen(false)}
          currentWallpaper={wallpaperType}
          customImage={customWallpaper}
          opacity={wallpaperOpacity}
          blur={wallpaperBlur}
          isRoomActive={!!roomName}
          roomName={roomName}
          onSelectWallpaper={handleSelectWallpaper}
          onUploadCustom={handleUploadCustomWallpaper}
          onClearCustom={handleClearCustomWallpaper}
          onChangeOpacity={handleChangeOpacity}
          onToggleBlur={handleToggleBlur}
          onBroadcastWallpaper={onBroadcastWallpaper}
        />
      )}

      {/* Instant Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureAndSend={handleCameraCaptureAndSend}
        initialMode={imageMode}
      />

      {/* Contextual Message Options Modal / Bottom Sheet */}
      {selectedMessageForOptions && (
        <div className="message-options-modal-layer">
          <div 
            className="message-options-backdrop"
            onClick={() => setSelectedMessageForOptions(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelectedMessageForOptions(null);
            }}
          />
          <div 
            className="message-options-card"
            role="dialog"
            aria-modal="true"
            aria-label="Message Actions"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="msg-opt-header">
              <div className="msg-opt-header-info">
                <span className="msg-opt-sender">
                  {selectedMessageForOptions.msg.senderId === userProfile?.id ? 'You' : (selectedMessageForOptions.msg.senderName || 'Peer')}
                </span>
                <span className="msg-opt-time">{selectedMessageForOptions.msg.time}</span>
              </div>
              <button 
                type="button"
                className="msg-opt-close-btn"
                onClick={() => setSelectedMessageForOptions(null)}
                title="Close options"
              >
                <X size={15} />
              </button>
            </div>

            {/* Snippet Preview */}
            <div className="msg-opt-preview">
              {selectedMessageForOptions.msg.type === 'text' && (
                <p className="msg-opt-preview-text">{selectedMessageForOptions.msg.text}</p>
              )}
              {selectedMessageForOptions.msg.type === 'image' && (
                <div className="msg-opt-preview-media">
                  <ImageIcon size={14} className="text-pink" />
                  <span>Photo ({selectedMessageForOptions.msg.imageMode || 'permanent'})</span>
                </div>
              )}
              {selectedMessageForOptions.msg.type === 'file' && (
                <div className="msg-opt-preview-media">
                  <FileText size={14} className="text-cyan" />
                  <span>{selectedMessageForOptions.msg.name || 'File'} ({formatBytes(selectedMessageForOptions.msg.size)})</span>
                </div>
              )}
            </div>

            <div className="msg-opt-actions-list">
              {/* Reply */}
              <button
                type="button"
                className="msg-opt-action-btn"
                onClick={() => {
                  sounds.playClick();
                  handleStartReply(selectedMessageForOptions.msg);
                  setSelectedMessageForOptions(null);
                }}
              >
                <div className="msg-opt-icon-circle action-reply">
                  <Reply size={16} />
                </div>
                <div className="msg-opt-action-text">
                  <span className="action-title">Reply</span>
                  <span className="action-subtitle">Quote this message in chat</span>
                </div>
              </button>

              {/* Copy */}
              <button
                type="button"
                className="msg-opt-action-btn"
                onClick={() => handleCopyMessage(selectedMessageForOptions.msg)}
              >
                <div className="msg-opt-icon-circle action-copy">
                  <Copy size={16} />
                </div>
                <div className="msg-opt-action-text">
                  <span className="action-title">
                    {selectedMessageForOptions.msg.type === 'text' ? 'Copy Text' : 'Copy'}
                  </span>
                  <span className="action-subtitle">Copy to clipboard</span>
                </div>
              </button>

              {/* Save / Download */}
              {(selectedMessageForOptions.msg.type === 'file' || (selectedMessageForOptions.msg.type === 'image' && selectedMessageForOptions.msg.imageMode !== 'once')) && selectedMessageForOptions.msg.dataUrl && (
                <button
                  type="button"
                  className="msg-opt-action-btn"
                  onClick={() => handleSaveMedia(selectedMessageForOptions.msg)}
                >
                  <div className="msg-opt-icon-circle action-download">
                    <Download size={16} />
                  </div>
                  <div className="msg-opt-action-text">
                    <span className="action-title">Save to Device</span>
                    <span className="action-subtitle">Download file or photo</span>
                  </div>
                </button>
              )}

              {/* View Fullscreen for Image */}
              {selectedMessageForOptions.msg.type === 'image' && !selectedMessageForOptions.msg.isBurned && (
                <button
                  type="button"
                  className="msg-opt-action-btn"
                  onClick={() => {
                    sounds.playClick();
                    if (selectedMessageForOptions.msg.imageMode === 'once') {
                      handleOpenViewOnce(selectedMessageForOptions.msg);
                    } else {
                      setViewOnceModalData(selectedMessageForOptions.msg);
                    }
                    setSelectedMessageForOptions(null);
                  }}
                >
                  <div className="msg-opt-icon-circle action-view">
                    <Eye size={16} />
                  </div>
                  <div className="msg-opt-action-text">
                    <span className="action-title">View Fullscreen</span>
                    <span className="action-subtitle">Expand photo view</span>
                  </div>
                </button>
              )}

              {/* Delete for Me */}
              <button
                type="button"
                className="msg-opt-action-btn action-delete-btn"
                onClick={() => handleDeleteFromSession(selectedMessageForOptions.msg.id)}
              >
                <div className="msg-opt-icon-circle action-delete">
                  <Trash2 size={16} />
                </div>
                <div className="msg-opt-action-text">
                  <span className="action-title">Delete for Me</span>
                  <span className="action-subtitle">Remove from this session</span>
                </div>
              </button>
            </div>

            <div className="msg-opt-footer">
              <ShieldCheck size={13} className="text-cyan" />
              <span>Direct End-to-End Encrypted Session</span>
            </div>
          </div>
        </div>
      )}

      {/* Copy Notification Toast */}
      {copyToast && (
        <div className="msg-copy-toast" role="status" aria-live="polite">
          <CheckCheck size={15} className="text-emerald" />
          <span>{copyToast}</span>
        </div>
      )}
    </div>
  );
}
