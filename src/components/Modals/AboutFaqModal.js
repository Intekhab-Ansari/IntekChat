'use client';

import React from 'react';
import { X, ShieldCheck, Zap, Lock, Smartphone, Globe, HelpCircle, ExternalLink, Sparkles } from 'lucide-react';

export default function AboutFaqModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const faqs = [
    {
      q: 'What is IntekDrop?',
      a: 'IntekDrop is an ultra-fast, open-source peer-to-peer (P2P) file sharing tool inspired by AirDrop and Snapdrop. It connects devices directly via WebRTC DataChannels across local Wi-Fi networks or the internet, allowing you to transfer documents, photos, videos, and large archives with zero server storage and zero file size caps.'
    },
    {
      q: 'What is IntekChat?',
      a: 'IntekChat is a privacy-first, ephemeral room messaging app. All messages and media attachments are encrypted in your browser using client-side AES-256-GCM cryptography. Rooms feature password protection, self-destructing View-Once photos, auto-delete room lifetimes, and zero message storage.'
    },
    {
      q: 'Do I need to install an app or create an account?',
      a: 'No. Both IntekDrop and IntekChat run 100% in your browser. There are no app store downloads, phone number sign-ups, or login credentials required. It works on Windows, macOS, Linux, Android, iPhone, and iPad.'
    },
    {
      q: 'Are files or messages uploaded to your servers?',
      a: 'Never. Files stream directly between peer devices over encrypted WebRTC DataChannels. Even when falling back to encrypted relay across strict firewalls, messages and files are end-to-end encrypted with zero server persistence. We store zero bytes of user data.'
    },
    {
      q: 'How does cross-platform sharing work between Windows, Mac, iOS & Android?',
      a: 'Because IntekDrop uses modern WebRTC web standards, any device with a web browser (Chrome, Safari, Edge, Firefox, Brave) can instantly discover nearby peers on the same network or pair anywhere via QR code.'
    },
    {
      q: 'What is the maximum file transfer size?',
      a: 'There is no artificial limit. Because transfers are direct device-to-device, you can send files as large as your device and network can handle, from small photos to multi-gigabyte video files.'
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card about-faq-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Sparkles size={18} className="text-cyan" />
            </div>
            <div>
              <h2 id="about-modal-title" className="modal-title">About &amp; FAQ</h2>
              <p className="modal-subtitle">High-Speed P2P File Sharing &amp; Private Encrypted Chat</p>
            </div>
          </div>
          <button 
            type="button"
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body about-faq-body">
          {/* Key Pillars */}
          <section className="about-pillars-grid">
            <div className="about-pillar-card">
              <div className="about-pillar-icon icon-cyan">
                <Zap size={20} />
              </div>
              <h3>Ultra-Fast P2P</h3>
              <p>Direct WebRTC gigabit transfers with no middleman or speed throttles.</p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon icon-purple">
                <Lock size={20} />
              </div>
              <h3>AES-256-GCM</h3>
              <p>Zero-knowledge client-side encryption for rooms, chats, and media.</p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon icon-pink">
                <ShieldCheck size={20} />
              </div>
              <h3>Zero Logs</h3>
              <p>No registration, no accounts, and zero file or message storage on servers.</p>
            </div>

            <div className="about-pillar-card">
              <div className="about-pillar-icon icon-emerald">
                <Smartphone size={20} />
              </div>
              <h3>Any Device</h3>
              <p>Seamlessly transfer between Windows, Android, Mac, iPhone, and Linux.</p>
            </div>
          </section>

          {/* Detailed Overview */}
          <article className="about-article">
            <h3>How IntekDrop Works</h3>
            <p>
              When you open <strong>IntekDrop</strong>, your browser discovers other active devices on your local network using secure WebSockets and MQTT signaling. When you select a recipient and drop a file, the two devices establish a direct <strong>WebRTC peer-to-peer connection</strong>. Chunks of data travel directly through your local Wi-Fi or encrypted TURN relays, ensuring maximum throughput and complete privacy.
            </p>
          </article>

          <article className="about-article">
            <h3>How IntekChat Protects Your Privacy</h3>
            <p>
              <strong>IntekChat</strong> creates temporary, private communication rooms. Room encryption keys are derived on your device using PBKDF2 with SHA-256 and AES-256-GCM. When you send messages, photos, or audio, they are encrypted locally before being transmitted over WebRTC DataChannels. Self-destructing View-Once photos burn automatically after viewing, leaving zero trace on servers or disks.
            </p>
          </article>

          {/* Interactive FAQ Accordion */}
          <section className="faq-section">
            <h3 className="faq-heading">
              <HelpCircle size={18} className="text-cyan" />
              Frequently Asked Questions
            </h3>

            <div className="faq-accordion-list">
              {faqs.map((faq, idx) => (
                <details key={idx} className="faq-item">
                  <summary className="faq-summary">
                    <span>{faq.q}</span>
                  </summary>
                  <div className="faq-content">
                    <p>{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Footer & Ecosystem Links */}
          <div className="about-modal-footer">
            <div className="about-footer-links">
              <a 
                href="https://github.com/Intekhab-Ansari/IntekChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="about-footer-link"
              >
                <Globe size={14} />
                <span>Open Source on GitHub</span>
                <ExternalLink size={12} />
              </a>

              <a 
                href="https://intekedit.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="about-footer-link"
              >
                <Sparkles size={14} className="text-emerald" />
                <span>IntekEdit Suite</span>
                <ExternalLink size={12} />
              </a>
            </div>
            <p className="about-copyright">
              intekchat &amp; intekdrop • Privacy-First P2P Web Applications
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
