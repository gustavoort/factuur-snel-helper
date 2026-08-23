export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
        aria-hidden
      >
        F
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-tight text-foreground">FactuurSnel</span>
      )}
    </span>
  );
}
