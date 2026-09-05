export default function DragOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/85">
      <div className="absolute inset-1 rounded-xl border-2 border-accent-lime" />
      <div className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
        Drop to Continue
      </div>
    </div>
  );
}
