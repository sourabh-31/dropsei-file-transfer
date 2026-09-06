"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ICE_SERVERS,
  SIGNALING_URL,
  createPeerConnection,
  sendFileInChunks,
  sendWhenOpen,
} from "@/lib/webrtc";
import { createSignalingClient, type SignalingClient } from "@/lib/signaling";
import { createProgressTracker } from "@/lib/transferProgress";
import { deriveRoomKey, hashPassphrase } from "@/lib/crypto";

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

export function useSendFile(enabled: boolean) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomLink, setRoomLink] = useState<string | null>(null);
  const [status, setStatus] = useState<SendStatus>("idle");
  const [progress, setProgress] = useState<SendProgress>({
    sentBytes: 0,
    totalBytes: 0,
    rateMBps: 0,
  });

  const signalingRef = useRef<SignalingClient | null>(null);
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

    const signaling = createSignalingClient(
      SIGNALING_URL,
      () => roomKeyPromiseRef.current,
    );
    signalingRef.current = signaling;

    function openPeerConnection() {
      // Close any previous connection first so it can't leak or leave a send loop hanging.
      peerConnectionRef.current?.close();

      const connection = createPeerConnection(ICE_SERVERS, (candidate) => {
        signaling.send("ice-candidate", { candidate });
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

      const trackProgress = createProgressTracker(file.size);

      try {
        await sendFileInChunks(file, dataChannel, (sentBytes) => {
          const sample = trackProgress(sentBytes);
          if (!sample) return;

          setProgress({
            sentBytes: sample.transferredBytes,
            totalBytes: sample.totalBytes,
            rateMBps: sample.rateMBps,
          });
        });
      } catch {
        // Channel died mid-send; a fresh peer-joined handshake starts the file over from scratch.
        return;
      }

      setStatus("done");
    }

    sendFileRef.current = sendFile;

    signaling.socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "room-created": {
          setRoomId(message.roomId);
          setRoomLink(`${window.location.origin}/download/${message.roomId}`);

          roomKeyPromiseRef.current = passphraseRef.current
            ? deriveRoomKey(passphraseRef.current, message.roomId)
            : Promise.resolve(null);
          return;
        }

        case "peer-joined": {
          setStatus("connecting");

          const peerConnection = openPeerConnection();
          const dataChannel = peerConnection.createDataChannel("data");
          dataChannelRef.current = dataChannel;

          dataChannel.addEventListener("open", () => {
            sendFile();
          });

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          await signaling.send("offer", {
            offer: peerConnection.localDescription,
          });
          return;
        }

        case "answer": {
          const { answer } = await signaling.unwrap<{
            answer: RTCSessionDescriptionInit;
          }>(message);
          await peerConnectionRef.current?.setRemoteDescription(answer);
          return;
        }

        case "ice-candidate": {
          const { candidate } = await signaling.unwrap<{
            candidate: RTCIceCandidateInit;
          }>(message);
          await peerConnectionRef.current?.addIceCandidate(candidate);
          return;
        }

        case "peer-left": {
          peerConnectionRef.current?.close();
          peerConnectionRef.current = null;
          dataChannelRef.current = null;
          setStatus("waiting-for-peer");
          return;
        }

        case "error": {
          console.error(message.message);
          return;
        }
      }
    });

    return () => {
      signaling.close();
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

      const socket = signalingRef.current?.socket;
      if (!socket) return;

      sendWhenOpen(
        socket,
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
