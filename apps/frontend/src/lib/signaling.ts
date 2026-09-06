import {
  decryptPayload,
  encryptPayload,
  type EncryptedPayload,
} from "@/lib/crypto";

export type RoomKeyProvider = () => Promise<CryptoKey | null>;

export interface SignalingClient {
  socket: WebSocket;
  // Encrypts the payload when a passphrase key exists; otherwise sends it as-is.
  send(type: string, payload?: Record<string, unknown>): Promise<void>;
  // Decrypts an incoming message when it carries an encrypted blob; otherwise passes it through.
  unwrap<T>(message: { encrypted?: EncryptedPayload }): Promise<T>;
  close(): void;
}

export function createSignalingClient(
  url: string,
  getRoomKey: RoomKeyProvider,
): SignalingClient {
  const socket = new WebSocket(url);

  async function send(type: string, payload: Record<string, unknown> = {}) {
    const key = await getRoomKey();

    if (key) {
      const encrypted = await encryptPayload(key, payload);
      socket.send(JSON.stringify({ type, encrypted }));
    } else {
      socket.send(JSON.stringify({ type, ...payload }));
    }
  }

  async function unwrap<T>(message: {
    encrypted?: EncryptedPayload;
  }): Promise<T> {
    if (!message.encrypted) return message as unknown as T;

    const key = await getRoomKey();
    if (!key) throw new Error("Received encrypted signal without a room key");

    return decryptPayload<T>(key, message.encrypted);
  }

  return { socket, send, unwrap, close: () => socket.close() };
}
