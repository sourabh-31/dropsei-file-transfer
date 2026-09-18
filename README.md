# 🚀 Dropsei

**Dropsei** is a peer-to-peer file transfer platform that lets you send files directly between devices using WebRTC. Files travel straight from sender to receiver, nothing is ever uploaded to or stored on a server.

## ✨ Features

- 🔗 Peer-to-peer file transfers using WebRTC
- 📱 Share files through a link or QR code
- 🚪 Room-based device connections
- 📦 Chunked transfers for large files
- 📊 Real-time transfer progress
- 🔒 No server-side file storage

## ⚙️ How It Works

Dropsei uses WebSockets for WebRTC signaling to connect two devices. Once the connection is established, files are transferred directly between the peers through a WebRTC DataChannel; the signaling server only helps set up the connection and never touches the file data itself.

## 🏗️ Project Structure

This is a PNPM workspace monorepo with two apps:

```
apps/
├── frontend/   # Next.js app (UI, QR codes, transfer screens)
└── backend/    # Cloudflare Worker (WebSocket signaling via Durable Objects)
```

## 🧰 Tech Stack

- ⚛️ Next.js
- 🟦 TypeScript
- 📡 WebRTC
- 🔌 WebSocket
- ☁️ Cloudflare Workers (Durable Objects)
- 📦 PNPM Workspaces

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [PNPM](https://pnpm.io/) 10+

### Installation

```bash
git clone https://github.com/sourabh-31/dropsei-file-transfer.git
cd dropsei-file-transfer
pnpm install
```

### Configuration

Create a `.env.local` file inside `apps/frontend` with the signaling server URL:

```bash
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:3000
```

### Development

Run both the frontend and backend in parallel:

```bash
pnpm dev
```

This starts the Next.js frontend and the Wrangler-powered signaling backend together. Check your terminal output for the exact local URLs/ports.

### Build

```bash
pnpm build
```

## ☕ Support

If you find Dropsei useful, consider [buying me a coffee](https://www.buymeacoffee.com/sourabh0003).

## 📄 License

This project is licensed under the [MIT License](LICENSE).
