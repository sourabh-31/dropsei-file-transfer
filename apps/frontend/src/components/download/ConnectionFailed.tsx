import Button from "@/components/shared/Button";

interface ConnectionFailedProps {
  message: string;
  onRetry?: () => void;
}

export default function ConnectionFailed({
  message,
  onRetry,
}: ConnectionFailedProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="m-0 text-5xl leading-none font-extrabold tracking-tight text-accent-coral sm:text-6xl md:text-7xl">
        Connection failed
      </h2>
      <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted-soft">
        {message}
      </p>
      {onRetry && (
        <div className="mt-8">
          <Button variant="coral" size="lg" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
