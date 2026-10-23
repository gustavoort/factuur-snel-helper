import { Check, ReceiptText } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        <ReceiptText className="h-[18px] w-[18px]" strokeWidth={2.2} />
        <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-landing-lime text-landing-ink">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      </span>
      {!compact && (
        <span className="text-base font-bold tracking-tight text-foreground">Faktuvi</span>
      )}
    </span>
  );
}
