import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({ meta: pageMeta("auth.forgot.title", "auth.forgot.subtitle") }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.forgot.title")} subtitle={t("auth.forgot.subtitle")}>
      {sent ? (
        <p className="text-sm text-muted-foreground">{t("auth.forgot.sent")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.busy") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          {t("auth.forgot.back")}
        </Link>
      </p>
    </AuthShell>
  );
}
