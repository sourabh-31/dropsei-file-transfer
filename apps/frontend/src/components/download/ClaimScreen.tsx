import { useEffect, useState } from "react";
import Button from "@/components/shared/Button";
import { formatBytes } from "@/lib/format";
import type { FileMetadata } from "@/lib/webrtc";

interface ClaimScreenProps {
  fileMetadata: FileMetadata | null;
  needsPassphrase: boolean;
  passphraseError: boolean;
  onSubmitPassphrase: (passphrase: string) => void;
  onAccept: () => void;
}

// Avoids a flash of "Connecting..." when the join resolves quickly.
const LOADING_DISPLAY_DELAY_MS = 300;

export default function ClaimScreen({
  fileMetadata,
  needsPassphrase,
  passphraseError,
  onSubmitPassphrase,
  onAccept,
}: ClaimScreenProps) {
  const [showLoading, setShowLoading] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  useEffect(() => {
    if (fileMetadata || needsPassphrase) return;

    const timer = setTimeout(
      () => setShowLoading(true),
      LOADING_DISPLAY_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [fileMetadata, needsPassphrase]);

  if (needsPassphrase) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="m-0 text-4xl leading-none font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          This one needs a passphrase
        </h2>
        <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted-soft">
          Ask the sender for it, then enter it below.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!passphrase) return;
            onSubmitPassphrase(passphrase);
          }}
          className="mt-8 flex w-full max-w-90 flex-col items-stretch gap-3"
        >
          <input
            type="text"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full rounded-md border border-surface-strong bg-background px-4 py-3.5 text-center font-mono text-sm text-foreground"
          />
          {passphraseError && (
            <span className="text-sm text-accent-coral">
              That wasn&apos;t it. Try again.
            </span>
          )}
          <Button type="submit" size="lg">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  if (!fileMetadata) {
    if (!showLoading) return null;

    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h2 className="m-0 text-5xl leading-none font-extrabold tracking-tight sm:text-6xl md:text-7xl">
          Connecting to the sender
        </h2>
        <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted-soft">
          Hang tight, this only takes a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="my-auto max-w-205">
      <h2 className="m-0 text-4xl leading-none font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
        Someone is holding
        <br />1 file for you
      </h2>
      <p className="mt-4.5 max-w-[48ch] text-base leading-relaxed text-muted-soft sm:mt-6">
        It comes straight out of their browser. Nothing was parked on a server
        on the way here.
      </p>
      <div className="mt-8">
        <div className="flex items-baseline gap-4.5 border-b border-border-subtle py-4.5">
          <span className="flex-1 truncate text-lg font-medium">
            {fileMetadata.name}
          </span>
          <span className="font-mono text-xs text-muted-soft">
            {formatBytes(fileMetadata.size)}
          </span>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-5.5">
        <Button size="lg" onClick={onAccept}>
          Accept and download
        </Button>
        <span className="text-sm text-muted">
          Comes straight from their device, no server in between
        </span>
      </div>
    </div>
  );
}
