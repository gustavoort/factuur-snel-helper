import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, currentLanguage, setLanguage, type Language } from "@/i18n";

export function LanguageSelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const value = currentLanguage();

  return (
    <div className={className}>
      <Select value={value} onValueChange={(next) => void setLanguage(next as Language)}>
        <SelectTrigger aria-label={t("lang.label")} className="h-9 w-full text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Languages className="h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language} value={language}>
              {t(`lang.${language}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
