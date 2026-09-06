"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ICE_SERVERS,
  SIGNALING_URL,
  createFileReceiver,
  createPeerConnection,
  sendWhenOpen,
  type FileMetadata,
} from "@/lib/webrtc";
import { createSignalingClient, type SignalingClient } from "@/lib/signaling";
import { createProgressTracker } from "@/lib/transferProgress";
import { deriveRoomKey, hashPassphrase } from "@/lib/crypto";

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
  const signalingRef = useRef<SignalingClient | null>(null);

  const [passphraseError, setPassphraseError] = useState(false);
  const attemptedPassphraseRef = useRef(false);
  // Kept across retries so a re-attempt can re-present it without asking again.
  const passphraseRef = useRef<string>("");
  // Resolves to null when the room has no passphrase, so callers can always await it.
  const roomKeyPromiseRef = useRef<Promise<CryptoKey | null>>(
    Promise.resolve(null),
  );

  useEffect(() => {
    if (!roomId) return;

    const signaling = createSignalingClient(
      `${SIGNALING_URL}?roomId=${encodeURIComponent(roomId)}`,
      () => roomKeyPromiseRef.current,
    );
    signalingRef.current = signaling;

    let trackProgress: ReturnType<typeof createProgressTracker> | null = null;

    const fileReceiver = createFileReceiver({
      onMetadata: (metadata) => {
        trackProgress = createProgressTracker(metadata.size);

        setFileMetadata(metadata);
        setStatus("receiving");
        setProgress({
          receivedBytes: 0,
          totalBytes: metadata.size,
          rateMBps: 0,
        });
      },
      onProgress: (receivedBytes) => {
        const sample = trackProgress?.(receivedBytes);
        if (!sample) return;

        setProgress({
          receivedBytes: sample.transferredBytes,
          totalBytes: sample.totalBytes,
          rateMBps: sample.rateMBps,
        });
      },
      onComplete: (file) => {
        setDownloadUrl(URL.createObjectURL(file));
        setStatus("done");
      },
    });

    function handleDisconnect() {
      // A disconnect after a successful download is just normal teardown.
      setStatus((prev) => (prev === "done" ? prev : "failed"));
    }

    function openPeerConnection() {
      const connection = createPeerConnection(ICE_SERVERS, (candidate) => {
        signaling.send("ice-candidate", { candidate });
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
        fileReceiver.attach(event.channel);
      });

      peerConnectionRef.current = connection;
      return connection;
    }

    signaling.socket.addEventListener("open", () => {
      openPeerConnection();

      (async () => {
        // Re-present a passphrase already validated earlier so a retry doesn't ask again.
        const passphraseHash = passphraseRef.current
          ? await hashPassphrase(passphraseRef.current)
          : undefined;

        signaling.socket.send(
          JSON.stringify({ type: "join-room", roomId, passphraseHash }),
        );
      })();
    });

    signaling.socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "room-joined": {
          setPassphraseError(false);
          setStatus("waiting");
          return;
        }

        case "passphrase-required": {
          // A prior attempt already supplied a passphrase, so this means it was wrong.
          if (attemptedPassphraseRef.current) setPassphraseError(true);
          setStatus("passphrase");
          return;
        }

        case "offer": {
          const peerConnection =
            peerConnectionRef.current ?? openPeerConnection();

          const { offer } = await signaling.unwrap<{
            offer: RTCSessionDescriptionInit;
          }>(message);
          await peerConnection.setRemoteDescription(offer);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          await signaling.send("answer", {
            answer: peerConnection.localDescription,
          });
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
          handleDisconnect();
          return;
        }

        case "error": {
          setStatus("error");
          console.error(message.message);
          return;
        }
      }
    });

    return () => {
      signaling.close();
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
        const socket = signalingRef.current?.socket;
        if (!socket) return;

        sendWhenOpen(
          socket,
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
