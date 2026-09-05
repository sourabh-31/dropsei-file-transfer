interface ChunkGridProps {
  total: number;
  chunkBytes: number;
  totalBytes: number;
  transferredBytes: number;
  columns: number;
  doneColor: string;
  inFlightColor: string;
}

export default function ChunkGrid({
  total,
  chunkBytes,
  totalBytes,
  transferredBytes,
  columns,
  doneColor,
  inFlightColor,
}: ChunkGridProps) {
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const cellStart = i * chunkBytes;
        const cellSize = Math.max(
          1,
          Math.min(cellStart + chunkBytes, totalBytes) - cellStart,
        );
        const filled = Math.min(
          Math.max(transferredBytes - cellStart, 0),
          cellSize,
        );
        const fraction = filled / cellSize;

        // Two-tone split shows progress within a cell instead of snapping straight to "done".
        const background =
          fraction <= 0
            ? undefined
            : fraction >= 1
              ? doneColor
              : `linear-gradient(to right, ${doneColor} ${fraction * 100}%, ${inFlightColor} ${fraction * 100}%)`;

        return (
          <span
            key={i}
            className="aspect-square w-full bg-border-subtle"
            style={{ background }}
          />
        );
      })}
    </div>
  );
}
