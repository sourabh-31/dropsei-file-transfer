# Dropsei

Dropsei is a peer-to-peer file transfer platform that lets you send files directly between devices using WebRTC. Files are transferred without being uploaded to or stored on a server.

## Features

- Peer-to-peer file transfers using WebRTC
- Share files through a link or QR code
- Room-based device connections
- Chunked transfers for large files
- Real-time transfer progress
- No server-side file storage

## How It Works

Dropsei uses WebSockets for WebRTC signaling to connect two devices. Once the connection is established, files are transferred directly between the peers through a WebRTC DataChannel. The signaling server only helps establish the connection and does not handle the file data.

## Tech Stack

- Next.js
- TypeScript
- WebRTC
- WebSocket
- PNPM Workspaces
