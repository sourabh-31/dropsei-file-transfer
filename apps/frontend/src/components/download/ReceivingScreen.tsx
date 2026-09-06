import { formatBytes } from "@/lib/format";
import { CHUNK_SIZE, type FileMetadata } from "@/lib/webrtc";
import { getVisualChunkBytes, getVisualChunkCount } from "@/lib/chunkGrid";
import type { ReceiveProgress, ReceiveStatus } from "@/hooks/useReceiveFile";
import ChunkGrid from "../shared/ChunkGrid";

interface ReceivingScreenProps {
  fileMetadata: FileMetadata | null;
  downloadUrl: string | null;
  // Parent renders ConnectionFailed instead of this screen for those two statuses.
  status: Exclude<ReceiveStatus, "failed" | "error">;
  progress: ReceiveProgress;
}

export default function ReceivingScreen({
  fileMetadata,
  downloadUrl,
  status,
  progress,
}: ReceivingScreenProps) {
  const isDone = status === "done";

  const total = progress.totalBytes || fileMetadata?.size || 0;
  const percent = total > 0 ? (progress.receivedBytes / total) * 100 : 0;
  const chunkTotal = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const chunkDone = isDone
    ? chunkTotal
    : Math.floor(progress.receivedBytes / CHUNK_SIZE);

  const visualChunkBytes = getVisualChunkBytes(total);
  const visualChunkTotal = getVisualChunkCount(total, visualChunkBytes);
  const etaSeconds =
    progress.rateMBps > 0
      ? (total - progress.receivedBytes) / (progress.rateMBps * 1024 * 1024)
      : 0;
  const eta = isDone
    ? "0s"
    : etaSeconds > 90
      ? `${Math.round(etaSeconds / 60)} min`
      : `${Math.max(1, Math.round(etaSeconds))} s`;

  const headline = isDone
    ? `${formatBytes(total)} landed`
    : `Pulling ${fileMetadata?.name ?? "file"}`;

  return (
    <div className="my-auto grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
      <div>
        <h2 className="m-0 text-3xl leading-none font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          {headline}
        </h2>
        <div className="mt-10 flex flex-wrap items-end gap-6.5">
          <span className="text-6xl leading-[0.85] font-bold tracking-tighter text-accent-lime sm:text-7xl lg:text-8xl">
            {Math.round(percent)}%
          </span>
          <div className="font-mono text-xs leading-loose text-muted">
            {formatBytes(progress.receivedBytes)} of {formatBytes(total)}
            <br />
            {progress.rateMBps.toFixed(1)} MB/s · {eta} left
            <br />
            chunk {chunkDone} / {chunkTotal}
          </div>
        </div>
        <div className="mt-7.5 h-1.5 overflow-hidden bg-border-subtle">
          <div
            className="h-full bg-accent-lime transition-[width] duration-200 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>

        {isDone && downloadUrl && fileMetadata && (
          <div className="mt-7.5">
            <a
              href={downloadUrl}
              download={fileMetadata.name}
              className="inline-block cursor-pointer rounded-md bg-accent-lime px-7 py-4 text-base font-bold text-background transition-colors hover:bg-accent-lime-hover"
            >
              Save file
            </a>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-surface p-6.5">
        <div className="font-mono text-xs tracking-widest text-label">
          CHUNK MAP
        </div>
        <div className="mt-4">
          <ChunkGrid
            total={visualChunkTotal}
            chunkBytes={visualChunkBytes}
            totalBytes={total}
            transferredBytes={progress.receivedBytes}
            columns={30}
            doneColor="#C9F25C"
            inFlightColor="#B49BFF"
          />
        </div>
        <div className="mt-5 flex flex-col gap-2.5 font-mono text-xs text-label">
          <span className="flex items-center gap-2.5">
            <span className="size-2.5 bg-accent-lime" />
            WRITTEN TO DISK
          </span>
          <span className="flex items-center gap-2.5">
            <span className="size-2.5 bg-accent-violet" />
            IN FLIGHT
          </span>
          <span className="flex items-center gap-2.5">
            <span className="size-2.5 bg-border-subtle" />
            PENDING
          </span>
        </div>
      </div>
    </div>
  );
}
