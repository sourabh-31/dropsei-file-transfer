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

export function truncateFilename(name: string, maxLength = 32) {
  if (name.length <= maxLength) return name;

  const lastDot = name.lastIndexOf(".");

  if (lastDot === -1) {
    return `${name.slice(0, maxLength - 3)}...`;
  }

  const extension = name.slice(lastDot);
  const available = maxLength - extension.length - 3;

  if (available <= 0) {
    return `${name.slice(0, maxLength - 3)}...`;
  }

  return `${name.slice(0, available)}...${extension}`;
}
