export { Room } from "./room.js";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

export default {
  async fetch(request, env) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    let roomId = url.searchParams.get("roomId");

    if (!roomId) {
      roomId = generateRoomId();
      url.searchParams.set("roomId", roomId);
    }

    const id = env.ROOMS.idFromName(roomId);
    const room = env.ROOMS.get(id);

    return room.fetch(new Request(url, request));
  },
};
