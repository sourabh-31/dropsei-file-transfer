import Button from "@/components/shared/Button";
import { formatBytes } from "@/lib/format";
import { CHUNK_SIZE } from "@/lib/webrtc";
import { getVisualChunkBytes, getVisualChunkCount } from "@/lib/chunkGrid";
import { useTransferStore } from "@/store/store";
import type { SendProgress, SendStatus } from "@/hooks/useSendFile";
import ChunkGrid from "../shared/ChunkGrid";
import { BeautifulQRCode } from "@beautiful-qr-code/react";

interface SendingScreenProps {
  roomId: string | null;
  roomLink: string | null;
  status: SendStatus;
  progress: SendProgress;
}

export default function SendingScreen({
  roomId,
  roomLink,
  status,
  progress,
}: SendingScreenProps) {
  const files = useTransferStore((s) => s.files);
  const pass = useTransferStore((s) => s.pass);
  const copied = useTransferStore((s) => s.copied);
  const setCopied = useTransferStore((s) => s.setCopied);
  const reset = useTransferStore((s) => s.reset);

  const total = progress.totalBytes || files.reduce((a, f) => a + f.bytes, 0);
  const summary = files.length === 1 ? "1 file" : `${files.length} files`;

  const isDone = status === "done";
  const percent = total > 0 ? (progress.sentBytes / total) * 100 : 0;
  const chunkTotal = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const chunksOut = isDone
    ? chunkTotal
    : Math.floor(progress.sentBytes / CHUNK_SIZE);

  const visualChunkBytes = getVisualChunkBytes(total);
  const visualChunkTotal = getVisualChunkCount(total, visualChunkBytes);

  const transferCode = roomId ?? "Waiting…";
  const transferLink = roomLink ?? "Generating link…";

  const hasPassphrase = Boolean(pass);
  const codeLabel = hasPassphrase ? "PASSPHRASE" : "TRANSFER CODE";
  const codeValue = hasPassphrase ? pass : transferCode;
  const canCopyCode = hasPassphrase || Boolean(roomId);

  const copy = (text: string, key: "code" | "link") => {
    if (key === "code" && !canCopyCode) return;
    if (key === "link" && !roomLink) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const onStop = () => reset("drop");

  return (
    <div className="my-auto grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div>
        <h2 className="m-0 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          {isDone ? "Sent" : "Serving"} {summary}
        </h2>

        <div className="mt-6 font-mono text-xs tracking-widest text-label">
          {codeLabel}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-5">
          <span className="text-2xl font-bold text-accent-violet sm:text-3xl lg:text-4xl">
            {codeValue}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canCopyCode}
            onClick={() => copy(codeValue, "code")}
          >
            {copied === "code" ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="mt-5 font-mono text-xs tracking-widest text-label">
          DIRECT LINK
        </div>
        <div className="mt-2.5 flex items-center gap-3.5">
          <span className="flex-1 truncate font-mono text-sm text-muted-soft">
            {transferLink}
          </span>
          <Button
            size="sm"
            disabled={!roomLink}
            onClick={() => roomLink && copy(roomLink, "link")}
          >
            {copied === "link" ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-9">
          <div>
            <div className="font-mono text-xs tracking-wide text-label">
              SENT
            </div>
            <div className="mt-1.5 text-2xl font-extrabold">
              {formatBytes(progress.sentBytes)}
            </div>
          </div>
          <div>
            <div className="font-mono text-xs tracking-wide text-label">
              LOCK
            </div>
            <div className="mt-1.5 text-2xl font-extrabold">
              {pass ? "Phrase" : "Link"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-surface p-5.5">
        <div className="relative size-40">
          <BeautifulQRCode
            data={transferLink}
            foregroundColor="#fff"
            className="size-40"
          />

          {!roomLink && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/40 backdrop-blur-[2px]">
              <div className="size-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
            </div>
          )}
        </div>
        <div className="mt-5.5 flex items-end justify-between gap-4">
          <span className="text-4xl leading-none font-extrabold tracking-tight">
            {Math.round(percent)}%
          </span>
          <span className="font-mono text-xs text-muted">
            {progress.rateMBps.toFixed(1)} MB/s
          </span>
        </div>
        <div className="mt-4">
          <ChunkGrid
            total={visualChunkTotal}
            chunkBytes={visualChunkBytes}
            totalBytes={total}
            transferredBytes={progress.sentBytes}
            columns={45}
            doneColor="#C9F25C"
            inFlightColor="#B49BFF"
          />
        </div>
        <div className="mt-3 font-mono text-xs text-label">
          {chunksOut} of {chunkTotal} chunks out
        </div>

        <div className="mt-5.5 flex flex-wrap gap-3.5">
          <Button variant="secondary" onClick={onStop}>
            Close Channel
          </Button>
        </div>
      </div>
    </div>
  );
}
