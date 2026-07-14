// Feature 9: End-to-End Encryption (E2EE) using Web Crypto API
// This is a simplified E2EE implementation for demonstration.
// In a real app, keys would be exchanged via Diffie-Hellman or stored securely.

export async function generateKeyFromRoomId(roomId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(roomId), // Using roomId as the secret for demo purposes
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('nexus-salt-string'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encoder.encode(text)
  );

  // Combine IV and cipher text
  const encryptedBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
  encryptedBuffer.set(iv, 0);
  encryptedBuffer.set(new Uint8Array(encryptedContent), iv.length);

  // Convert to Base64
  return btoa(String.fromCharCode(...encryptedBuffer));
}

export async function decryptText(encryptedBase64: string, key: CryptoKey): Promise<string> {
  try {
    const binaryStr = atob(encryptedBase64);
    const encryptedBuffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      encryptedBuffer[i] = binaryStr.charCodeAt(i);
    }

    const iv = encryptedBuffer.slice(0, 12);
    const data = encryptedBuffer.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '🔒 Розшифрування не вдалося';
  }
}
