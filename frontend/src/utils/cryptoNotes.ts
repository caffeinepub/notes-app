// Simple password-based encryption using Web Crypto API
// Note: This is frontend encryption for privacy, not military-grade security

/** Ensure we always work with a concrete Uint8Array<ArrayBuffer> */
function toConcreteUint8Array(input: Uint8Array): Uint8Array<ArrayBuffer> {
  if (input.buffer instanceof ArrayBuffer) {
    return input as Uint8Array<ArrayBuffer>;
  }
  // Copy into a fresh ArrayBuffer (handles SharedArrayBuffer edge case)
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy as Uint8Array<ArrayBuffer>;
}

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptContent(content: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

export async function decryptContent(encryptedContent: string, password: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    const key = await deriveKey(password, salt);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    throw new Error('Decryption failed. Incorrect password or corrupted data.');
  }
}

/**
 * Encrypt raw image bytes with a password using AES-GCM.
 * Returns a Uint8Array<ArrayBuffer> containing: salt (16) + iv (12) + ciphertext.
 */
export async function encryptImage(imageBytes: Uint8Array, password: string): Promise<Uint8Array<ArrayBuffer>> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  // Ensure concrete ArrayBuffer for Web Crypto API
  const concreteBytes = toConcreteUint8Array(imageBytes);

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    concreteBytes
  );

  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  return combined as Uint8Array<ArrayBuffer>;
}

/**
 * Decrypt image bytes that were encrypted with encryptImage.
 * Expects a Uint8Array containing: salt (16) + iv (12) + ciphertext.
 * Returns a Uint8Array<ArrayBuffer> with the original image bytes.
 */
export async function decryptImage(encryptedBytes: Uint8Array, password: string): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const salt = encryptedBytes.slice(0, 16);
    const iv = encryptedBytes.slice(16, 28);
    const encryptedData = encryptedBytes.slice(28);

    const key = await deriveKey(password, salt);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      toConcreteUint8Array(encryptedData)
    );

    return new Uint8Array(decryptedData) as Uint8Array<ArrayBuffer>;
  } catch (error) {
    throw new Error('Image decryption failed. Incorrect password or corrupted data.');
  }
}
