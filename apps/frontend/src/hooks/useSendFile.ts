"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ICE_SERVERS,
  SIGNALING_URL,
  sendFileInChunks,
  sendWhenOpen,
} from "@/lib/webrtc";
import {
  decryptPayload,
  deriveRoomKey,
  encryptPayload,
  hashPassphrase,
  type EncryptedPayload,
} from "@/lib/crypto";

export type SendStatus =
  | "idle"
  | "waiting-for-peer"
  | "connecting"
  | "sending"
  | "done";

export interface SendProgress {
  sentBytes: number;
  totalBytes: number;
  rateMBps: number;
}

const PROGRESS_THROTTLE_MS = 120;

export function useSendFile(enabled: boolean) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomLink, setRoomLink] = useState<string | null>(null);
  const [status, setStatus] = useState<SendStatus>("idle");
  const [progress, setProgress] = useState<SendProgress>({
    sentBytes: 0,
    totalBytes: 0,
    rateMBps: 0,
  });

  const signalingChannelRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const sendFileRef = useRef<() => Promise<void>>(async () => {});

  const passphraseRef = useRef<string>("");
  // Resolves to null when no passphrase was set, so callers can always await it.
  const roomKeyPromiseRef = useRef<Promise<CryptoKey | null>>(
    Promise.resolve(null),
  );

  useEffect(() => {
    // Don't open a signaling connection until there's actually something to send.
    if (!enabled) return;

    // Fresh connection, fresh state - otherwise a new transfer briefly renders
    // with the previous one's leftover roomId/progress (e.g. stuck at 100%).
    setRoomId(null);
    setRoomLink(null);
    setStatus("idle");
    setProgress({ sentBytes: 0, totalBytes: 0, rateMBps: 0 });

    const signalingChannel = new WebSocket(SIGNALING_URL);
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

    function createPeerConnection() {
      // Close any previous connection first so it can't leak or leave a send loop hanging.
      peerConnectionRef.current?.close();

      const connection = new RTCPeerConnection(ICE_SERVERS);

      connection.addEventListener("icecandidate", (event) => {
        if (!event.candidate) return;

        sendSignal("ice-candidate", { candidate: event.candidate });
      });

      peerConnectionRef.current = connection;

      return connection;
    }

    async function sendFile() {
      const file = selectedFileRef.current;
      const dataChannel = dataChannelRef.current;

      if (!file || !dataChannel || dataChannel.readyState !== "open") return;

      dataChannel.send(
        JSON.stringify({
          type: "metadata",
          name: file.name,
          size: file.size,
          mimeType: file.type,
        }),
      );

      setStatus("sending");
      setProgress({ sentBytes: 0, totalBytes: file.size, rateMBps: 0 });

      const transferStart = performance.now();
      let lastProgressAt = 0;

      try {
        await sendFileInChunks(file, dataChannel, (sentBytes) => {
          const now = performance.now();
          const isDone = sentBytes >= file.size;
          if (!isDone && now - lastProgressAt < PROGRESS_THROTTLE_MS) return;
          lastProgressAt = now;

          const elapsedSeconds = (now - transferStart) / 1000;
          const rateMBps =
            elapsedSeconds > 0
              ? sentBytes / 1024 / 1024 / elapsedSeconds
              : 0;

          setProgress({ sentBytes, totalBytes: file.size, rateMBps });
        });
      } catch {
        // Channel died mid-send; a fresh peer-joined handshake starts the file over from scratch.
        return;
      }

      setStatus("done");
    }

    sendFileRef.current = sendFile;

    signalingChannel.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "room-created") {
        setRoomId(message.roomId);
        setRoomLink(`${window.location.origin}/download/${message.roomId}`);

        if (passphraseRef.current) {
          roomKeyPromiseRef.current = deriveRoomKey(
            passphraseRef.current,
            message.roomId,
          );
        }
        return;
      }

      if (message.type === "peer-joined") {
        setStatus("connecting");

        const peerConnection = createPeerConnection();
        const dataChannel = peerConnection.createDataChannel("data");
        dataChannelRef.current = dataChannel;

        dataChannel.addEventListener("open", () => {
          sendFile();
        });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        await sendSignal("offer", { offer: peerConnection.localDescription });
        return;
      }

      if (message.type === "answer") {
        const { answer } = await unwrapSignal<{
          answer: RTCSessionDescriptionInit;
        }>(message);
        await peerConnectionRef.current?.setRemoteDescription(answer);
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
        dataChannelRef.current = null;
        setStatus("waiting-for-peer");
        return;
      }

      if (message.type === "error") {
        console.error(message.message);
      }
    });

    return () => {
      signalingChannel.close();
      peerConnectionRef.current?.close();
    };
  }, [enabled]);

  const createRoom = useCallback((passphrase = "") => {
    passphraseRef.current = passphrase;
    setStatus("waiting-for-peer");

    (async () => {
      const passphraseHash = passphrase
        ? await hashPassphrase(passphrase)
        : null;

      const channel = signalingChannelRef.current;
      if (!channel) return;

      sendWhenOpen(
        channel,
        JSON.stringify({ type: "create-room", passphraseHash }),
      );
    })();
  }, []);

  const handleFileSelect = useCallback((file: File | null) => {
    selectedFileRef.current = file;

    if (!file) return;

    // If a connection is already open, send immediately.
    sendFileRef.current();
  }, []);

  return { roomId, roomLink, status, progress, createRoom, handleFileSelect };
}
