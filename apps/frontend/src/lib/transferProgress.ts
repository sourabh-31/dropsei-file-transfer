export interface TransferProgressSample {
  transferredBytes: number;
  totalBytes: number;
  rateMBps: number;
}

const PROGRESS_THROTTLE_MS = 120;

// Returns a sampler that throttles progress reporting to once per
// PROGRESS_THROTTLE_MS, always letting the final (completion) sample through
// so the UI doesn't stall short of 100%. Returns null for samples to skip.
export function createProgressTracker(totalBytes: number) {
  const start = performance.now();
  let lastReportAt = 0;

  return function sample(transferredBytes: number): TransferProgressSample | null {
    const now = performance.now();
    const isDone = transferredBytes >= totalBytes;
    if (!isDone && now - lastReportAt < PROGRESS_THROTTLE_MS) return null;
    lastReportAt = now;

    const elapsedSeconds = (now - start) / 1000;
    const rateMBps =
      elapsedSeconds > 0 ? transferredBytes / 1024 / 1024 / elapsedSeconds : 0;

    return { transferredBytes, totalBytes, rateMBps };
  };
}
