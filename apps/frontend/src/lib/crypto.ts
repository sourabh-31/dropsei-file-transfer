// Passphrase-derived crypto for signaling. The passphrase never leaves the
// browser: the backend only ever sees a one-way hash (to gate room joins)
// and encrypted blobs (offer/answer/ICE candidates) it cannot decrypt.

const PBKDF2_ITERATIONS = 150_000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Namespaced so this hash can't be replayed against some other passphrase-gated feature.
export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoded = new TextEncoder().encode(`dropsei-passphrase:${passphrase}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToBase64(digest);
}

// Salted per room so the same passphrase never produces the same key twice.
export async function deriveRoomKey(
  passphrase: string,
  roomId: string,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(`dropsei-room:${roomId}`),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  iv: string;
  data: string;
}

export async function encryptPayload(
  key: CryptoKey,
  payload: unknown,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return { iv: bufferToBase64(iv), data: bufferToBase64(ciphertext) };
}

export async function decryptPayload<T>(
  key: CryptoKey,
  encrypted: EncryptedPayload,
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(encrypted.iv) },
    key,
    base64ToBuffer(encrypted.data),
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}
