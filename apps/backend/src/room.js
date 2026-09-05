export class Room {
  constructor(ctx) {
    this.ctx = ctx;
    this.sender = null;
    this.receiver = null;
    // One-way hash only — the passphrase itself never reaches the backend.
    this.passphraseHash = null;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.attachSocketHandlers(server, roomId);

    return new Response(null, { status: 101, webSocket: client });
  }

  attachSocketHandlers(socket, roomId) {
    socket.addEventListener("message", (event) => {
      let message;

      try {
        message = JSON.parse(event.data);
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
        this.handleMessage(socket, message, roomId);
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });

    socket.addEventListener("close", () => {
      try {
        this.handleClose(socket);
      } catch (err) {
        console.error("Error handling close:", err);
      }
    });

    socket.addEventListener("error", (err) => {
      console.error("Socket error:", err);
    });
  }

  handleMessage(socket, message, roomId) {
    if (message.type === "create-room") {
      this.sender = socket;
      this.passphraseHash = message.passphraseHash || null;

      socket.send(
        JSON.stringify({
          type: "room-created",
          roomId,
        }),
      );

      return;
    }

    if (message.type === "join-room") {
      if (!this.sender) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Room not found",
          }),
        );

        return;
      }

      if (this.receiver) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Room is already full",
          }),
        );

        return;
      }

      if (
        this.passphraseHash &&
        this.passphraseHash !== message.passphraseHash
      ) {
        socket.send(
          JSON.stringify({
            type: "passphrase-required",
          }),
        );

        return;
      }

      this.receiver = socket;

      // Tell sender
      this.sender.send(
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
      const otherPeer = socket === this.sender ? this.receiver : this.sender;

      if (otherPeer) {
        otherPeer.send(JSON.stringify(message));
      }

      return;
    }
  }

  handleClose(socket) {
    if (socket === this.sender) {
      this.sender = null;
      this.receiver = null;
      return;
    }

    if (socket === this.receiver) {
      this.receiver = null;

      if (this.sender) {
        this.sender.send(
          JSON.stringify({
            type: "peer-left",
          }),
        );
      }
    }
  }
}
