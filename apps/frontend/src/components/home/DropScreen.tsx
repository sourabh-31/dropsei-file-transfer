import Button from "@/components/shared/Button";

interface DropScreenProps {
  onPickFiles: () => void;
}

const FEATURES = [
  {
    title: "No size limit",
    body: "Send a file of any size. Nothing is copied to a server first, so sending starts the second you drop it.",
  },
  {
    title: "Never stored",
    body: "Only on your device and theirs. We keep no copy, and the link stops working when you close the tab.",
  },
  {
    title: "Peer to peer",
    body: "Files move straight from your device to theirs over a direct connection. No relay server in between.",
  },
  {
    title: "Password optional",
    body: "Set a password and the other person has to type it first, so a shared link on its own is not enough.",
  },
];

export default function DropScreen({ onPickFiles }: DropScreenProps) {
  return (
    <div className="my-auto grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.3fr_1px_0.7fr] lg:gap-13">
      <div>
        <h1 className="m-0 text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
          Send.
          <br />
          <span className="text-accent-violet">Don't Upload.</span>
        </h1>
        <p className="mt-4.5 max-w-[40ch] text-lg leading-relaxed text-muted-soft sm:mt-8">
          Send files directly from your device to theirs. Nothing is uploaded or
          stored in the cloud. Just share the link and start sending.
        </p>
        <div className="mt-4.5 flex flex-wrap items-center gap-5 sm:mt-9">
          <Button size="lg" onClick={onPickFiles}>
            Choose files
          </Button>
          <span className="text-sm text-muted">
            or drop them anywhere on this page
          </span>
        </div>
      </div>

      <div className="hidden self-stretch bg-surface-strong lg:block" />

      <div className="flex flex-col">
        {FEATURES.map((feature, i) => (
          <div key={feature.title}>
            {i > 0 && <div className="h-px bg-surface-strong" />}
            <div className="py-4.5">
              <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {feature.title}
              </div>
              <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
