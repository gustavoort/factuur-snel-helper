import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusSelectProps {
  value: string;
  statuses: readonly string[];
  disabled?: boolean;
  label: string;
  onChange: (status: string) => void;
}

/** Lets the user move a document between the statuses supported by the backend. */
export function StatusSelect({
  value,
  statuses,
  disabled,
  label,
  onChange,
}: StatusSelectProps) {
  const { t } = useTranslation();
  const current = value.trim().toLowerCase();

  return (
    <Select
      value={statuses.includes(current) ? current : ""}
      disabled={disabled === true}
      onValueChange={(next) => {
        if (next && next !== current) onChange(next);
      }}
    >
      <SelectTrigger className="mt-2 w-full" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {t(`status.${status}`, { defaultValue: status })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
