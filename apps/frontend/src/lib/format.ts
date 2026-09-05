const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number): string {
  if (!bytes && bytes !== 0) return "0 B";
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024;
    i++;
  }
  const value = n < 10 && i > 0 ? n.toFixed(1) : Math.round(n);
  return `${value} ${UNITS[i]}`;
}
