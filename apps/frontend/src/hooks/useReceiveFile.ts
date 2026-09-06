"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ICE_SERVERS,
  SIGNALING_URL,
  sendWhenOpen,
  type FileMetadata,
} from "@/lib/webrtc";
import {
  decryptPayload,
  deriveRoomKey,
  encryptPayload,
  hashPassphrase,
  type EncryptedPayload,
} from "@/lib/crypto";

export type ReceiveStatus =
  | "connecting"
  | "passphrase"
  | "waiting"
  | "receiving"
  | "failed"
  | "done"
  | "error";

export interface ReceiveProgress {
  receivedBytes: number;
  totalBytes: number;
  rateMBps: number;
}

const PROGRESS_THROTTLE_MS = 120;

export function useReceiveFile(roomId: string | undefined) {
  const [status, setStatus] = useState<ReceiveStatus>("connecting");
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<ReceiveProgress>({
    receivedBytes: 0,
    totalBytes: 0,
    rateMBps: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<WebSocket | null>(null);

  const [passphraseError, setPassphraseError] = useState(false);
  const attemptedPassphraseRef = useRef(false);
  // Kept across retries so a re-attempt can re-present it without asking again.
  const passphraseRef = useRef<string>("");
  // Resolves to null when the room has no passphrase, so callers can always await it.
  const roomKeyPromiseRef = useRef<Promise<CryptoKey | null>>(
    Promise.resolve(null),
  );

  const metadataRef = useRef<FileMetadata | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedBytesRef = useRef(0);

  useEffect(() => {
    if (!roomId) return;

    const signalingChannel = new WebSocket(
      `${SIGNALING_URL}?roomId=${encodeURIComponent(roomId)}`,
    );
    signalingChannelRef.current = signalingChannel;

    // Encrypts the payload when a passphrase key exists; otherwise sends it as-is.
    async function sendSignal(type: string, payload: Record<string, unknown>) {
      const key = await roomKeyPromiseRef.current;

      if (key) {
        const encrypted = await encryptPayload(key, payload);
        signalingChannel.send(JSON.stringify({ type, encrypted }));
      } else {
        signalingChannel.send(JSON.stringify({ type, ...payload }));
      }
    }

    // Decrypts an incoming message when it carries an encrypted blob; otherwise passes it through.
    async function unwrapSignal<T>(message: {
      encrypted?: EncryptedPayload;
    }): Promise<T> {
      if (!message.encrypted) return message as unknown as T;

      const key = await roomKeyPromiseRef.current;
      if (!key) throw new Error("Received encrypted signal without a room key");

      return decryptPayload<T>(key, message.encrypted);
    }

    let transferStart = 0;
    let lastProgressAt = 0;

    function handleDisconnect() {
      // A disconnect after a successful download is just normal teardown.
      setStatus((prev) => (prev === "done" ? prev : "failed"));
    }

    function createPeerConnection() {
      const connection = new RTCPeerConnection(ICE_SERVERS);

      connection.addEventListener("icecandidate", (event) => {
        if (!event.candidate) return;

        sendSignal("ice-candidate", { candidate: event.candidate });
      });

      connection.addEventListener("connectionstatechange", () => {
        if (
          connection.connectionState === "failed" ||
          connection.connectionState === "disconnected"
        ) {
          handleDisconnect();
        }
      });

      connection.addEventListener("datachannel", (event) => {
        setupDataChannel(event.channel);
      });

      peerConnectionRef.current = connection;

      return connection;
    }

    function setupDataChannel(channel: RTCDataChannel) {
      channel.binaryType = "arraybuffer";

      channel.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data);

          if (message.type === "metadata") {
            metadataRef.current = message;
            transferStart = performance.now();
            lastProgressAt = 0;

            setFileMetadata(message);
            setStatus("receiving");
            setProgress({
              receivedBytes: receivedBytesRef.current,
              totalBytes: message.size,
              rateMBps: 0,
            });
          }

          return;
        }

        const metadata = metadataRef.current;
        if (!metadata) {
          console.error("Received file before metadata");
          return;
        }

        receivedChunksRef.current.push(event.data);
        receivedBytesRef.current += event.data.byteLength;

        const now = performance.now();
        const isDone = receivedBytesRef.current >= metadata.size;

        if (isDone || now - lastProgressAt >= PROGRESS_THROTTLE_MS) {
          lastProgressAt = now;
          const elapsedSeconds = (now - transferStart) / 1000;
          const rateMBps =
            elapsedSeconds > 0
              ? receivedBytesRef.current / 1024 / 1024 / elapsedSeconds
              : 0;
          setProgress({
            receivedBytes: receivedBytesRef.current,
            totalBytes: metadata.size,
            rateMBps,
          });
        }

        if (isDone) {
          const blob = new Blob(receivedChunksRef.current, {
            type: metadata.mimeType,
          });
          setDownloadUrl(URL.createObjectURL(blob));
          setStatus("done");
        }
      });
    }

    signalingChannel.addEventListener("open", () => {
      createPeerConnection();

      (async () => {
        // Re-present a passphrase already validated earlier so a retry doesn't ask again.
        const passphraseHash = passphraseRef.current
          ? await hashPassphrase(passphraseRef.current)
          : undefined;

        signalingChannel.send(
          JSON.stringify({ type: "join-room", roomId, passphraseHash }),
        );
      })();
    });

    signalingChannel.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "room-joined") {
        setPassphraseError(false);
        setStatus("waiting");
        return;
      }

      if (message.type === "passphrase-required") {
        // A prior attempt already supplied a passphrase, so this means it was wrong.
        if (attemptedPassphraseRef.current) setPassphraseError(true);
        setStatus("passphrase");
        return;
      }

      if (message.type === "offer") {
        const peerConnection =
          peerConnectionRef.current ?? createPeerConnection();

        const { offer } = await unwrapSignal<{
          offer: RTCSessionDescriptionInit;
        }>(message);
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await sendSignal("answer", { answer: peerConnection.localDescription });
        return;
      }

      if (message.type === "ice-candidate") {
        const { candidate } = await unwrapSignal<{
          candidate: RTCIceCandidateInit;
        }>(message);
        await peerConnectionRef.current?.addIceCandidate(candidate);
        return;
      }

      if (message.type === "peer-left") {
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        handleDisconnect();
        return;
      }

      if (message.type === "error") {
        setStatus("error");
        console.error(message.message);
      }
    });

    return () => {
      signalingChannel.close();
      peerConnectionRef.current?.close();
    };
  }, [roomId]);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  const submitPassphrase = useCallback(
    (passphrase: string) => {
      attemptedPassphraseRef.current = true;
      passphraseRef.current = passphrase;
      setPassphraseError(false);

      if (roomId) {
        roomKeyPromiseRef.current = deriveRoomKey(passphrase, roomId);
      }

      (async () => {
        const passphraseHash = await hashPassphrase(passphrase);
        const channel = signalingChannelRef.current;
        if (!channel) return;

        sendWhenOpen(
          channel,
          JSON.stringify({ type: "join-room", roomId, passphraseHash }),
        );
      })();
    },
    [roomId],
  );

  return {
    status,
    fileMetadata,
    downloadUrl,
    progress,
    retry,
    passphraseError,
    submitPassphrase,
  };
}
