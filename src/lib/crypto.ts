
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-512",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function exportPublicKey(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return bufferToBase64(exported);
}

export async function importPublicKey(pem: string) {
  const binaryDer = base64ToBuffer(pem);
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-512",
    },
    true,
    ["encrypt"]
  );
}

export async function exportPrivateKey(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(exported);
}

export async function importPrivateKey(pem: string) {
  const binaryDer = base64ToBuffer(pem);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-512",
    },
    true,
    ["decrypt"]
  );
}

export async function encryptMessage(message: string, publicKey: CryptoKey) {
  try {
    const aesKey = await generateAESKey();
    const encrypted = await encryptWithAES(message, aesKey);
    const encryptedKey = await encryptAESKeyForUser(aesKey, publicKey);
    
    return JSON.stringify({
      content: encrypted.content,
      iv: encrypted.iv,
      key: encryptedKey,
      v: "h1" // version hybrid 1
    });
  } catch (e) {
    console.error("Hybrid encryption failed, falling back to RSA", e);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      data
    );
    return bufferToBase64(encrypted);
  }
}

export async function decryptMessage(encryptedStr: string, privateKey: CryptoKey) {
  try {
    let packet;
    try {
      packet = JSON.parse(encryptedStr);
    } catch (e) {
      // Not JSON, assume legacy RSA
      const data = base64ToBuffer(encryptedStr);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        data
      );
      return new TextDecoder().decode(decryptedBuffer);
    }

    if (packet.v === "h1" && packet.key && packet.content && packet.iv) {
      const aesKey = await decryptAESKeyWithUserPrivateKey(packet.key, privateKey);
      return await decryptWithAES(packet.content, packet.iv, aesKey);
    }

    // Legacy RSA fallback if it was JSON but not hybrid
    const data = base64ToBuffer(encryptedStr);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      data
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    // Return a neutral placeholder instead of throwing to prevent UI crashes as requested
    return "[Secure Signal]";
  }
}

export async function generateAESKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bufferToBase64(exported);
}

export async function importAESKey(base64: string) {
  const bytes = base64ToBuffer(base64);
  return await window.crypto.subtle.importKey(
    "raw",
    bytes.buffer,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithAES(text: string, key: CryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    encoder.encode(text)
  );
  return {
    content: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decryptWithAES(encryptedBase64: string, ivBase64: string, key: CryptoKey) {
  try {
    const encryptedBytes = base64ToBuffer(encryptedBase64);
    const ivBytes = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      key,
      encryptedBytes
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error("AES Decryption failed:", error);
    throw error;
  }
}

export async function encryptAESKeyForUser(aesKey: CryptoKey, userPublicKey: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    userPublicKey,
    exported
  );
  return bufferToBase64(encrypted);
}

export async function decryptAESKeyWithUserPrivateKey(encryptedAESKeyBase64: string, userPrivateKey: CryptoKey) {
  try {
    const bytes = base64ToBuffer(encryptedAESKeyBase64);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      userPrivateKey,
      bytes
    );
    return await window.crypto.subtle.importKey(
      "raw",
      decryptedBuffer,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("AES Key decryption failed:", error);
    throw error;
  }
}

export async function encryptBlob(blob: Blob, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await blob.arrayBuffer();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    arrayBuffer
  );
  return {
    encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decryptToBlob(encryptedArrayBuffer: ArrayBuffer, ivBase64: string, key: CryptoKey, mimeType: string): Promise<Blob> {
  try {
    const ivBytes = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
      key,
      encryptedArrayBuffer
    );
    return new Blob([decryptedBuffer], { type: mimeType });
  } catch (error) {
    console.error("Blob decryption failed:", error);
    throw error;
  }
}

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-512', dataBuffer);
  return bufferToBase64(hashBuffer);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 310000,
      hash: "SHA-512"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
