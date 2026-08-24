import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/quotes";

const styles: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-primary/30 bg-primary/10 text-primary",
  accepted: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700",
};

export function QuoteStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
