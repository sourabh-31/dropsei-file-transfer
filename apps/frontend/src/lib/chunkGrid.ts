import { CHUNK_SIZE } from "./webrtc";

// Caps the grid at this many cells, grouping multiple real chunks per cell on large files.
const MAX_GRID_CELLS = 180;

export function getVisualChunkBytes(totalBytes: number): number {
  const realChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
  const chunksPerCell = Math.max(1, Math.ceil(realChunks / MAX_GRID_CELLS));
  return chunksPerCell * CHUNK_SIZE;
}

export function getVisualChunkCount(
  totalBytes: number,
  chunkBytes: number,
): number {
  return Math.max(1, Math.ceil(totalBytes / chunkBytes));
}
