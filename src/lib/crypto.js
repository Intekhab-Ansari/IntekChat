// Web Crypto API - Native End-to-End Encryption (AES-256-GCM + PBKDF2)
// Runs 100% client-side with zero external dependencies.

const SALT_PREFIX = 'intekchat-e2ee-salt-v1';

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Computes SHA-256 hash of room password for zero-knowledge signaling verification
 */
export async function hashPassword(password) {
  if (!password) return null;
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null;
  }
  const enc = new TextEncoder();
  const data = enc.encode(`intekchat-pwd-${password}`);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a room secret string
 */
export async function deriveKey(roomSecret) {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const enc = new TextEncoder();
  const rawKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(roomSecret || 'intekchat-default-secret'),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = enc.encode(`${SALT_PREFIX}-${roomSecret || 'global'}`);

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts any JSON-serializable payload (or string) using AES-256-GCM
 */
export async function encryptPayload(data, cryptoKey) {
  if (typeof window === 'undefined') return data;
  if (!cryptoKey) return data;

  try {
    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(data));
    
    // Generate fresh 96-bit (12-byte) initialization vector per message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      cryptoKey,
      encodedData
    );

    return {
      _isEncrypted: true,
      iv: bufferToBase64(iv),
      cipher: bufferToBase64(encryptedBuffer)
    };
  } catch (err) {
    console.error('Encryption failed, falling back:', err);
    return data;
  }
}

/**
 * Decrypts an encrypted payload using AES-256-GCM
 */
export async function decryptPayload(payload, cryptoKey) {
  if (typeof window === 'undefined') return payload;
  if (!payload || !payload._isEncrypted || !cryptoKey) return payload;

  try {
    const iv = base64ToBuffer(payload.iv);
    const cipher = base64ToBuffer(payload.cipher);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      cryptoKey,
      cipher
    );

    const dec = new TextDecoder();
    const decodedString = dec.decode(decryptedBuffer);
    return JSON.parse(decodedString);
  } catch (err) {
    console.error('Decryption failed:', err);
    return {
      type: 'error',
      text: '⚠️ [Unable to decrypt message - mismatched room key]'
    };
  }
}
