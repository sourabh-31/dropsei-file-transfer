export const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:3000";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// A socket can still be CONNECTING when the first send is triggered (e.g. a
// user clicking through before the handshake finishes) — send() throws in
// that state instead of queuing, so wait for "open" rather than risk it.
export function sendWhenOpen(channel: WebSocket, payload: string) {
  if (channel.readyState === WebSocket.OPEN) {
    channel.send(payload);
  } else {
    channel.addEventListener("open", () => channel.send(payload), {
      once: true,
    });
  }
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
}

// 16 KiB stays under the lowest common SCTP message-size limit across browsers.
export const CHUNK_SIZE = 16 * 1024;

// Pause sending once the outgoing buffer crosses this size.
export const MAX_BUFFERED_AMOUNT = CHUNK_SIZE * 64;

// Resume once the buffer drains back down to this size.
export const BUFFERED_AMOUNT_LOW_THRESHOLD = CHUNK_SIZE * 8;

function waitForBufferedAmountLow(dataChannel: RTCDataChannel): Promise<void> {
  return new Promise((resolve) => {
    function cleanup() {
      dataChannel.removeEventListener("bufferedamountlow", onLow);
      dataChannel.removeEventListener("close", onClose);
    }

    function onLow() {
      cleanup();
      resolve();
    }

    // Resolve on close too, so a dead channel throws on the next send() instead of hanging here forever.
    function onClose() {
      cleanup();
      resolve();
    }

    dataChannel.addEventListener("bufferedamountlow", onLow);
    dataChannel.addEventListener("close", onClose);
  });
}

export async function sendFileInChunks(
  file: File,
  dataChannel: RTCDataChannel,
  onProgress?: (sentBytes: number) => void,
  startOffset = 0,
) {
  dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;

  let offset = startOffset;

  while (offset < file.size) {
    if (dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      await waitForBufferedAmountLow(dataChannel);
    }

    const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    dataChannel.send(chunk);
    offset += chunk.byteLength;
    onProgress?.(offset);
  }
}
