import Button from "@/components/shared/Button";
import { formatBytes } from "@/lib/format";
import { useTransferStore } from "@/store/store";

interface StagedScreenProps {
  onOpenChannel: () => void;
}

export default function StagedScreen({ onOpenChannel }: StagedScreenProps) {
  const files = useTransferStore((s) => s.files);
  const pass = useTransferStore((s) => s.pass);
  const setPass = useTransferStore((s) => s.setPass);
  const removeFile = useTransferStore((s) => s.removeFile);
  const reset = useTransferStore((s) => s.reset);

  const total = files.reduce((a, f) => a + f.bytes, 0);
  const summary = files.length === 1 ? "1 file" : `${files.length} files`;

  const onCancel = () => reset("drop");

  return (
    <div className="my-auto grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
      <div>
        <h2 className="m-0 text-4xl leading-none font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          {summary}
          <br />
          {formatBytes(total)} ready
        </h2>
        <div className="mt-8">
          {files.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col gap-2 border-b border-border-subtle py-4.5 sm:flex-row sm:items-baseline sm:gap-4.5"
            >
              <div className="flex min-w-0 items-baseline gap-4.5 sm:flex-1">
                <span className="shrink-0 font-mono text-xs text-muted-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-lg font-medium">
                  {f.name}
                </span>
              </div>
              <div className="flex items-center justify-end gap-4.5">
                <span className="font-mono text-xs text-muted-soft">
                  {formatBytes(f.bytes)}
                </span>
                <span className="font-mono text-xs tracking-wide text-muted-faint uppercase">
                  {f.kind}
                </span>
                <button
                  onClick={() => removeFile(f.id)}
                  className="cursor-pointer bg-transparent text-sm text-muted-faint transition-colors hover:text-accent-coral"
                >
                  drop
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-surface px-7 py-7.5">
        <div className="text-base font-bold">Passphrase</div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Optional. When set, the receiver types it before a single byte moves.
        </p>
        <input
          type="text"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Leave empty for link only"
          className="mt-4.5 w-full rounded-md border border-surface-strong bg-background px-4 py-3.5 font-mono text-sm text-foreground"
        />
        <Button onClick={onOpenChannel} className="mt-6 w-full">
          Open the channel
        </Button>
        <Button variant="ghost" onClick={onCancel} className="mt-3 w-full p-2">
          Cancel
        </Button>
      </div>
    </div>
  );
}
