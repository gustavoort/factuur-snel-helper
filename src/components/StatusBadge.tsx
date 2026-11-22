import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-primary/30 bg-primary/10 text-primary",
  accepted: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700",
  paid: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700",
  unpaid: "border-amber-600/30 bg-amber-600/10 text-amber-700",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
  active: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700",
  cancel_at_period_end: "border-amber-600/30 bg-amber-600/10 text-amber-700",
};

/** Shows a backend status with a translated label; unknown statuses render neutrally. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const key = status.trim().toLowerCase();
  const label = key
    ? t(`status.${key}`, { defaultValue: status.replace(/[_-]+/g, " ") })
    : t("status.unknown");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[key] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
