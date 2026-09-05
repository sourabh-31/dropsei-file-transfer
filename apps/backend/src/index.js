import express from "express";
import { WebSocketServer } from "ws";

try {
  process.loadEnvFile();
} catch {
  // .env is optional — fall back to process.env / defaults
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const server = app.listen(PORT, () => {
  console.log(`Server running on ${PUBLIC_URL}`);
});

server.on("error", (err) => {
  console.error("HTTP server error:", err);
});

const wss = new WebSocketServer({ server });

wss.on("error", (err) => {
  console.error("WebSocket server error:", err);
});

const rooms = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

wss.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });

  socket.on("message", (data) => {
    let message;

    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error("Invalid message JSON:", err);
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        }),
      );
      return;
    }

    try {
      handleMessage(socket, message);
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");

    try {
      handleClose(socket);
    } catch (err) {
      console.error("Error handling close:", err);
    }
  });
});

function handleMessage(socket, message) {
  if (message.type === "create-room") {
    const roomId = generateRoomId();

    rooms.set(roomId, {
      sender: socket,
      receiver: null,
      // One-way hash only — the passphrase itself never reaches the backend.
      passphraseHash: message.passphraseHash || null,
    });

    socket.roomId = roomId;
    socket.role = "sender";

    console.log(`Room created: ${roomId}`);

    socket.send(
      JSON.stringify({
        type: "room-created",
        roomId,
      }),
    );

    return;
  }

  if (message.type === "join-room") {
    const room = rooms.get(message.roomId);

    if (!room) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Room not found",
        }),
      );

      return;
    }

    if (room.receiver) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Room is already full",
        }),
      );

      return;
    }

    if (room.passphraseHash && room.passphraseHash !== message.passphraseHash) {
      socket.send(
        JSON.stringify({
          type: "passphrase-required",
        }),
      );

      return;
    }

    room.receiver = socket;

    socket.roomId = message.roomId;
    socket.role = "receiver";

    console.log(`Receiver joined room: ${message.roomId}`);

    // Tell sender
    room.sender.send(
      JSON.stringify({
        type: "peer-joined",
      }),
    );

    // Tell receiver
    socket.send(
      JSON.stringify({
        type: "room-joined",
      }),
    );

    return;
  }

  if (
    message.type === "offer" ||
    message.type === "answer" ||
    message.type === "ice-candidate"
  ) {
    const room = rooms.get(socket.roomId);

    if (!room) {
      return;
    }

    const otherPeer = socket === room.sender ? room.receiver : room.sender;

    if (otherPeer) {
      otherPeer.send(JSON.stringify(message));
    }

    return;
  }
}

function handleClose(socket) {
  if (!socket.roomId) {
    return;
  }

  const room = rooms.get(socket.roomId);

  if (!room) {
    return;
  }

  if (socket === room.sender) {
    rooms.delete(socket.roomId);
    console.log(`Room deleted: ${socket.roomId}`);
  } else {
    room.receiver = null;

    if (room.sender) {
      room.sender.send(
        JSON.stringify({
          type: "peer-left",
        }),
      );
    }
  }
}
