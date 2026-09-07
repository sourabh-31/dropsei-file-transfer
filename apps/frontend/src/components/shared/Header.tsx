export default function Header() {
  return (
    <header className="flex items-center justify-between gap-3 px-6 py-6 sm:px-10">
      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl font-extrabold tracking-tight">dropsei</span>
        <span className="text-sm font-medium tracking-tight text-accent-lime">
          p2p
        </span>
      </div>
      <a
        href="https://www.buymeacoffee.com/sourabh0003"
        className="flex items-center gap-2.5 rounded-full bg-surface p-2.5 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-surface-strong hover:text-accent-lime sm:px-4.5 sm:py-2.5"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy me a coffee"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-accent-lime"
        >
          <path d="M3 6h9v5a4 4 0 01-4 4H7a4 4 0 01-4-4z" />
          <path d="M12 7.5h1.8a1.8 1.8 0 010 3.6H12" />
          <path d="M4.5 3.2v1.2" />
          <path d="M7.5 2.6v1.8" />
          <path d="M10.5 3.2v1.2" />
        </svg>
        <span className="hidden sm:inline">Buy me a coffee</span>
      </a>
    </header>
  );
}
